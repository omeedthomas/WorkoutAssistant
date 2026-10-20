import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cloudConfigured, describeCloudError, getBackend, type CloudBackend, type CloudUser, type SyncStatus } from '../cloud';
import { SyncEngine, type ReconcileResult } from '@ascent/core/cloud/syncEngine';
import { localMetaStore } from '../cloud/metaStore';
import { useToast } from '../components/Toast';
import { clearActiveWorkout } from './activeWorkout';
import { initialProgress } from '@ascent/core/state/progress';
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
  /** Renew Drive access by itself on the next tap when it's about to run out (a per-device setting). */
  autoReconnect: boolean;
  setAutoReconnect: (on: boolean) => void;
}

const AUTO_RECONNECT_KEY = 'ascent:auto-reconnect';
/** Renew this long before access runs out, so saving never has to wait. */
const RENEW_AHEAD_MS = 5 * 60_000;
/** After a failed automatic renewal (e.g. a blocked pop-up), wait this long before trying again by itself. */
const RETRY_AFTER_MS = 10 * 60_000;

function loadAutoReconnect(): boolean {
  try {
    return localStorage.getItem(AUTO_RECONNECT_KEY) !== '0';
  } catch {
    return true;
  }
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
  const [autoReconnect, setAutoReconnectState] = useState(loadAutoReconnect);
  /** A renewal in progress (automatic or from the Reconnect button), so taps don't start a second one. */
  const renewingRef = useRef<Promise<void> | null>(null);
  /** The last automatic renewal failed, so the Reconnect prompt is shown again. */
  const autoFailedRef = useRef(false);
  const autoRef = useRef(autoReconnect);
  autoRef.current = autoReconnect;

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
        isOffline: () => navigator.onLine === false,
        setStatus: (s) => {
          setStatus(s);
          if (s === 'synced') {
            setLastSyncedAt(Date.now());
            setError(null);
            warnedExpiryRef.current = false;
            setFolderUrl(backend.folderUrl?.() ?? null);
          }
          // With automatic renewal on, the next tap reconnects, so only prompt if that didn't work.
          const autoRenews = autoRef.current && !autoFailedRef.current && !!backend.accessExpiresAt;
          if (s === 'reconnect' && !warnedExpiryRef.current && !announceRef.current && !autoRenews && !renewingRef.current) {
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

  /** Gets fresh Drive access and saves whatever was waiting. Shares a renewal that's already under way. */
  const renew = useCallback((): Promise<void> => {
    if (!backend) return Promise.resolve();
    renewingRef.current ??= backend
      .reconnect()
      .then(() => {
        autoFailedRef.current = false;
        warnedExpiryRef.current = false;
        setError(null);
        return engineRef.current?.resume();
      })
      .finally(() => {
        renewingRef.current = null;
      });
    return renewingRef.current;
  }, [backend]);

  const reconnect = useCallback(async () => {
    try {
      await renew();
    } catch (e) {
      report(e, "Couldn't reconnect");
    }
  }, [renew, report]);

  // Google gives a browser app hour-long access tokens and no refresh token, and only lets a page ask for a new
  // one in response to a tap. So rather than waiting for the Reconnect button, renew on the next tap once access
  // is about to run out (or has). Google remembers the consent, so at most a window flashes open and closes.
  useEffect(() => {
    const expiresAt = backend?.accessExpiresAt?.bind(backend);
    if (!expiresAt || !uid || !autoReconnect) return;
    let lastTry = 0;
    // `click` rather than `pointerdown`: on touch screens only the end of a tap counts as a user gesture, and
    // Google's window would be blocked without one. Keyboard activation of buttons and links fires `click` too.
    const onTap = () => {
      const left = (expiresAt() ?? 0) - Date.now();
      if (left > RENEW_AHEAD_MS || renewingRef.current || Date.now() - lastTry < RETRY_AFTER_MS) return;
      lastTry = Date.now();
      renew().catch((err) => {
        autoFailedRef.current = true;
        setError(describeCloudError(err));
        // Only bother the user if saving is actually blocked; otherwise the next attempt can wait.
        if (left <= 0 && !warnedExpiryRef.current) {
          warnedExpiryRef.current = true;
          toast('Reconnect Google Drive', "Couldn't renew access by itself. Your progress is safe on this device; tap Reconnect to save it to Drive.");
        }
      });
    };
    window.addEventListener('click', onTap, true);
    return () => window.removeEventListener('click', onTap, true);
  }, [backend, uid, autoReconnect, renew, toast]);

  const setAutoReconnect = useCallback((on: boolean) => {
    setAutoReconnectState(on);
    autoFailedRef.current = false;
    try {
      localStorage.setItem(AUTO_RECONNECT_KEY, on ? '1' : '0');
    } catch {
      // not persisted; applies until the page reloads
    }
  }, []);

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
      autoReconnect,
      setAutoReconnect,
    }),
    [ready, user, status, lastSyncedAt, error, folderUrl, signIn, signOut, reconnect, syncNow, autoReconnect, setAutoReconnect],
  );

  return <CloudContext.Provider value={api}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudApi {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloud must be used inside <CloudProvider>');
  return ctx;
}
