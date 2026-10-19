import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cloudConfigured, describeCloudError, getBackend, type CloudBackend, type CloudUser, type SyncStatus } from '../cloud';
import { localMetaStore, SyncEngine, type ReconcileResult } from '../cloud/syncEngine';
import { useToast } from '../components/Toast';
import { clearActiveWorkout } from './activeWorkout';
import { initialProgress } from './progress';
import { useProgress } from './ProgressContext';

export interface CloudApi {
  /** Accounts are set up for this build. */
  available: boolean;
  /** The backend has loaded and we know whether someone is signed in. */
  ready: boolean;
  user: CloudUser | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  /** Link to the Ascent folder in Google Drive, once known. */
  folderUrl: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Renew Drive access after it expires (call from a click). */
  reconnect: () => Promise<void>;
  syncNow: () => void;
}

const CloudContext = createContext<CloudApi | null>(null);

const RECONCILE_MESSAGES: Record<ReconcileResult, [string, string]> = {
  uploaded: ['Signed in', 'Your progress is now saved in your Google Drive, in the Ascent folder.'],
  downloaded: ['Signed in', 'Your progress has been loaded from Google Drive.'],
  merged: ['Signed in', "This device's progress was combined with what's in your Google Drive."],
  unchanged: ['Signed in', 'Your progress is in sync with Google Drive.'],
};

export function CloudProvider({ children }: { children: ReactNode }) {
  const progress = useProgress();
  const toast = useToast();
  const [backend, setBackend] = useState<CloudBackend | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);

  const engineRef = useRef<SyncEngine | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const announceRef = useRef(false); // toast the reconcile result only after a sign-in click
  const warnedExpiryRef = useRef(false);

  // Load the backend (lazily pulls in Google sign-in) and follow the auth state.
  useEffect(() => {
    if (!cloudConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getBackend()
      .then((b) => {
        if (cancelled || !b) return;
        setBackend(b);
        unsubscribe = b.onAuthChange((u) => {
          setUser(u);
          setReady(true);
        });
      })
      .catch((e) => {
        setError(describeCloudError(e));
        setReady(true);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // One sync engine per signed-in account.
  const uid = user?.uid;
  useEffect(() => {
    if (!backend || !uid) {
      setStatus('idle');
      setFolderUrl(null);
      return;
    }
    const engine = new SyncEngine(
      backend,
      uid,
      {
        getState: () => progressRef.current.state,
        replace: (s) => progressRef.current.importState(s),
        setStatus: (s) => {
          setStatus(s);
          if (s === 'synced') {
            setLastSyncedAt(Date.now());
            setError(null);
            warnedExpiryRef.current = false;
            setFolderUrl(backend.folderUrl?.() ?? null);
          }
          if (s === 'reconnect' && !warnedExpiryRef.current && !announceRef.current) {
            warnedExpiryRef.current = true;
            toast('Reconnect Google Drive', "Your progress is safe on this device. Tap Reconnect and it'll be saved to Drive.");
          }
        },
        onReconciled: (result) => {
          if (announceRef.current || result === 'merged') toast(...RECONCILE_MESSAGES[result]);
          announceRef.current = false;
          void backend.locateFolder?.().then(() => setFolderUrl(backend.folderUrl?.() ?? null));
        },
        onError: (e) => setError(describeCloudError(e)),
      },
      localMetaStore,
    );
    engineRef.current = engine;
    void engine.start();
    return () => {
      engine.stop();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [backend, uid, toast]);

  // Push every local change (debounced inside the engine).
  useEffect(() => {
    engineRef.current?.schedulePush();
  }, [progress.state]);

  // Pick up other devices' changes when you come back; retry when the connection returns.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && void engineRef.current?.refresh();
    const onOnline = () => void engineRef.current?.resume();
    const onOffline = () => engineRef.current && setStatus('offline');
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const report = useCallback(
    (e: unknown, title: string) => {
      const message = describeCloudError(e);
      if (message) {
        setError(message);
        toast(title, message);
      }
    },
    [toast],
  );

  const signIn = useCallback(async () => {
    if (!backend) return;
    setError(null);
    announceRef.current = true;
    try {
      await backend.signIn();
      // Same account as before (e.g. after signing in again): pick up where the engine left off.
      void engineRef.current?.resume();
    } catch (e) {
      announceRef.current = false;
      report(e, "Couldn't sign in");
    }
  }, [backend, report]);

  const reconnect = useCallback(async () => {
    if (!backend) return;
    try {
      await backend.reconnect();
      setError(null);
      await engineRef.current?.resume();
    } catch (e) {
      report(e, "Couldn't reconnect");
    }
  }, [backend, report]);

  const signOut = useCallback(async () => {
    if (!backend) return;
    const engine = engineRef.current;
    if (engine && status !== 'reconnect') await engine.flush();
    if (localMetaStore.get()?.dirty) {
      const ok = window.confirm(
        "Some changes haven't been saved to your Google Drive yet. Sign out anyway and lose them on this device? (Tip: Reconnect first to save them.)",
      );
      if (!ok) return;
    }
    engine?.stop();
    engineRef.current = null;
    await backend.signOut();
    localMetaStore.clear();
    // The device copy belongs to the account; clear it so the next person starts fresh.
    progressRef.current.importState({ ...initialProgress, onboarded: false });
    clearActiveWorkout();
    setLastSyncedAt(null);
    toast('Signed out', 'Your progress is saved in your Google Drive. Sign in again to pick up where you left off.');
  }, [backend, status, toast]);

  const syncNow = useCallback(() => {
    if (status === 'reconnect') void reconnect();
    else void engineRef.current?.resume();
  }, [status, reconnect]);

  const api = useMemo<CloudApi>(
    () => ({
      available: cloudConfigured,
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
    [ready, user, status, lastSyncedAt, error, folderUrl, signIn, signOut, reconnect, syncNow],
  );

  return <CloudContext.Provider value={api}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudApi {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloud must be used inside <CloudProvider>');
  return ctx;
}
