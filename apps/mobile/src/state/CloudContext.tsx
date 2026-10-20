import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { SyncEngine, type MetaStore, type ReconcileResult } from '@ascent/core/cloud/syncEngine';
import type { CloudBackend, CloudUser, SyncStatus } from '@ascent/core/cloud/types';
import { initialProgress } from '@ascent/core/state/progress';
import { cloudConfigured } from '../cloud/config';
import { describeCloudError, getBackend } from '../cloud';
import { loadMetaStore } from '../cloud/local';
import { ask, notify } from '../lib/dialogs';
import { useActiveWorkout } from './ActiveWorkoutContext';
import { useProgress } from './ProgressContext';

export interface CloudApi {
  /** Sync is set up in this build (Google client ids, or the dev mock) and can run here. */
  available: boolean;
  /** Why it can't run here although it's set up (e.g. in Expo Go). */
  unavailableReason: string | null;
  /** The saved sign-in has been checked. */
  ready: boolean;
  user: CloudUser | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  folderUrl: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Restores Drive access after it ran out, then saves what was waiting. */
  reconnect: () => Promise<void>;
  syncNow: () => void;
}

const RECONCILE_MESSAGES: Record<ReconcileResult, [string, string]> = {
  uploaded: ['Signed in', 'Your progress is now saved in your Google Drive, in the Ascent folder.'],
  downloaded: ['Signed in', 'Your progress has been loaded from Google Drive.'],
  merged: ['Signed in', "This phone's progress was combined with what's in your Google Drive."],
  unchanged: ['Signed in', 'Your progress is in sync with Google Drive.'],
};

const CloudContext = createContext<CloudApi | null>(null);

/**
 * Keeps this phone's progress and the signed-in Google Drive in step with core's SyncEngine, the same way the
 * web app does: reconcile on sign-in, push changes, pull when the app comes back to the foreground.
 */
export function CloudProvider({ children }: { children: ReactNode }) {
  const progress = useProgress();
  const session = useActiveWorkout();
  const [backend, setBackend] = useState<CloudBackend | null>(null);
  const [meta, setMeta] = useState<MetaStore | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);
  /** Why sync can't run in this build (e.g. Expo Go), when it's configured but can't load. */
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const engineRef = useRef<SyncEngine | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const offlineRef = useRef(false);
  /** Tell the user how the first sync went only after they tapped Sign in. */
  const announceRef = useRef(false);
  const renewingRef = useRef<Promise<void> | null>(null);

  // Load the backend and the sync bookkeeping, then follow the sign-in state.
  useEffect(() => {
    if (!cloudConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    Promise.all([getBackend(), loadMetaStore()])
      .then(([b, m]) => {
        if (cancelled || !b) return;
        setMeta(m);
        setBackend(b);
        unsubscribe = b.onAuthChange((u) => {
          setUser(u);
          setReady(true);
        });
      })
      .catch((e) => {
        if ((e as { code?: string })?.code === 'auth/needs-dev-build') setUnavailable(describeCloudError(e));
        else setError(describeCloudError(e));
        setReady(true);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  /** Gets Drive access back (silently on the phone when possible) and saves whatever was waiting. */
  const renew = useCallback((): Promise<void> => {
    if (!backend) return Promise.resolve();
    renewingRef.current ??= backend
      .reconnect()
      .then(() => {
        setError(null);
        return engineRef.current?.resume();
      })
      .finally(() => {
        renewingRef.current = null;
      });
    return renewingRef.current;
  }, [backend]);

  // One sync engine per signed-in account.
  const uid = user?.uid;
  useEffect(() => {
    if (!backend || !meta || !uid) {
      setStatus('idle');
      setFolderUrl(null);
      return;
    }
    let triedRenewal = false;
    const engine = new SyncEngine(
      backend,
      uid,
      {
        getState: () => progressRef.current.state,
        replace: (s) => progressRef.current.replaceState(s),
        isOffline: () => offlineRef.current,
        setStatus: (s) => {
          setStatus(s);
          if (s === 'synced') {
            setLastSyncedAt(Date.now());
            setError(null);
            setFolderUrl(backend.folderUrl?.() ?? null);
            triedRenewal = false;
          }
          // The native SDKs can usually renew access without asking, so try that once before showing Reconnect.
          if (s === 'reconnect' && !triedRenewal) {
            triedRenewal = true;
            renew().catch((e) => setError(describeCloudError(e)));
          }
        },
        onReconciled: (result) => {
          if (announceRef.current || result === 'merged') notify(...RECONCILE_MESSAGES[result]);
          announceRef.current = false;
          void backend.locateFolder?.().then(() => setFolderUrl(backend.folderUrl?.() ?? null));
        },
        onError: (e) => setError(describeCloudError(e)),
      },
      meta,
    );
    engineRef.current = engine;
    void engine.start();
    return () => {
      engine.stop();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [backend, meta, uid, renew]);

  // Push every local change (debounced inside the engine).
  useEffect(() => {
    engineRef.current?.schedulePush();
  }, [progress.state]);

  // Pick up other devices' changes when the app comes back, and retry when the connection returns.
  useEffect(() => {
    const appState = AppState.addEventListener('change', (s) => s === 'active' && void engineRef.current?.refresh());
    const unsubscribeNet = NetInfo.addEventListener((net) => {
      const offline = net.isConnected === false;
      const wasOffline = offlineRef.current;
      offlineRef.current = offline;
      if (!engineRef.current) return;
      if (offline) setStatus('offline');
      else if (wasOffline) void engineRef.current.resume();
    });
    return () => {
      appState.remove();
      unsubscribeNet();
    };
  }, []);

  const signIn = useCallback(async () => {
    if (!backend) return;
    setError(null);
    announceRef.current = true;
    try {
      await backend.signIn();
      // Same account as before: pick up where the engine left off.
      void engineRef.current?.resume();
    } catch (e) {
      announceRef.current = false;
      const message = describeCloudError(e);
      if (message) {
        setError(message);
        notify("Couldn't sign in", message);
      }
    }
  }, [backend]);

  const reconnect = useCallback(async () => {
    try {
      await renew();
    } catch (e) {
      const message = describeCloudError(e);
      if (message) {
        setError(message);
        notify("Couldn't reconnect", message);
      }
    }
  }, [renew]);

  const signOut = useCallback(async () => {
    if (!backend || !meta) return;
    const engine = engineRef.current;
    if (engine && status !== 'reconnect') await engine.flush();
    if (meta.get()?.dirty) {
      const ok = await ask(
        'Sign out anyway?',
        "Some changes haven't been saved to your Google Drive yet, and signing out removes them from this phone. Reconnect first to keep them.",
        'Sign out',
        true,
      );
      if (!ok) return;
    }
    engine?.stop();
    engineRef.current = null;
    await backend.signOut();
    meta.clear();
    // This phone's copy belongs to the account; clear it so the next person starts fresh.
    progressRef.current.replaceState({ ...initialProgress, onboarded: false });
    session.end();
    setLastSyncedAt(null);
    notify('Signed out', 'Your progress is saved in your Google Drive. Sign in again to pick up where you left off.');
  }, [backend, meta, status, session]);

  /** Saves what's waiting, then picks up changes from other devices (e.g. what you just logged on the website). */
  const syncNow = useCallback(() => {
    if (status === 'reconnect') return void reconnect();
    const engine = engineRef.current;
    void engine?.resume().then(() => engine.refresh());
  }, [status, reconnect]);

  const api = useMemo<CloudApi>(
    () => ({
      available: cloudConfigured && !unavailable,
      unavailableReason: unavailable,
      ready,
      user,
      status,
      lastSyncedAt,
      error,
      folderUrl,
      signIn,
      signOut,
      reconnect,
      syncNow,
    }),
    [unavailable, ready, user, status, lastSyncedAt, error, folderUrl, signIn, signOut, reconnect, syncNow],
  );
  return <CloudContext.Provider value={api}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudApi {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloud must be used inside <CloudProvider>');
  return ctx;
}
