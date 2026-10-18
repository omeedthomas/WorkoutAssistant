import { Cloud, CloudAlert, CloudOff, CloudUpload, FolderOpen, LogOut, RefreshCw } from 'lucide-react';
import type { CloudUser, SyncStatus } from '../cloud';
import { useCloud } from '../state/CloudContext';

/** The multicolour Google "G", for the sign-in button. */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function GoogleSignInButton({ compact = false }: { compact?: boolean }) {
  const cloud = useCloud();
  return (
    <button className={`btn google-btn${compact ? ' btn--sm' : ''}`} onClick={() => void cloud.signIn()} disabled={!cloud.ready}>
      <GoogleIcon size={compact ? 16 : 18} />
      {compact ? 'Sign in' : 'Sign in with Google'}
    </button>
  );
}

export function Avatar({ user, size = 32 }: { user: CloudUser; size?: number }) {
  const initials = (user.name ?? user.email ?? '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return user.photoURL ? (
    <img className="avatar" src={user.photoURL} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar avatar--initials" style={{ width: size, height: size }} aria-hidden>
      {initials}
    </span>
  );
}

export function syncLabel(status: SyncStatus, lastSyncedAt: number | null): string {
  switch (status) {
    case 'syncing':
      return 'Saving to Google Drive…';
    case 'offline':
      return "Offline. Changes will save to Drive when you're back online.";
    case 'error':
      return "Couldn't save to Google Drive";
    case 'reconnect':
      return 'Drive connection expired. Your progress is safe on this device.';
    case 'synced': {
      if (!lastSyncedAt) return 'Saved to Google Drive';
      const mins = Math.floor((Date.now() - lastSyncedAt) / 60_000);
      return mins < 1 ? 'Saved to Google Drive just now' : `Saved to Google Drive ${mins} min ago`;
    }
    default:
      return 'Signed in';
  }
}

function SyncIcon({ status, size = 14 }: { status: SyncStatus; size?: number }) {
  if (status === 'syncing') return <CloudUpload size={size} className="sync-icon is-syncing" aria-hidden />;
  if (status === 'offline') return <CloudOff size={size} className="sync-icon is-offline" aria-hidden />;
  if (status === 'error' || status === 'reconnect') return <CloudAlert size={size} className="sync-icon is-error" aria-hidden />;
  return <Cloud size={size} className="sync-icon is-synced" aria-hidden />;
}

/** Header control: "Sign in" when signed out, avatar with a sync indicator when signed in. */
export function AccountButton() {
  const cloud = useCloud();
  if (!cloud.available) return null;
  if (!cloud.ready) return <span className="account-btn account-btn--loading" aria-hidden />;
  if (!cloud.user) return <GoogleSignInButton compact />;
  if (cloud.status === 'reconnect') {
    return (
      <button className="btn btn--sm google-btn" onClick={() => void cloud.reconnect()} title={syncLabel('reconnect', null)}>
        <GoogleIcon size={16} /> Reconnect
      </button>
    );
  }
  const label = syncLabel(cloud.status, cloud.lastSyncedAt);
  return (
    <a href="#/settings" className="account-btn" title={`${cloud.user.name ?? cloud.user.email ?? 'Account'}: ${label}`} aria-label={`Account: ${label}`}>
      <Avatar user={cloud.user} size={30} />
      <span className="account-btn__sync">
        <SyncIcon status={cloud.status} size={12} />
      </span>
    </a>
  );
}

/** Settings section: sign in, see who you're signed in as and the sync state, sign out. */
export function AccountSection() {
  const cloud = useCloud();

  if (!cloud.available) {
    return (
      <section className="card settings-section">
        <h2>Account</h2>
        <p className="muted small">
          Accounts aren't set up for this copy of the app, so progress stays in this browser. To turn on Google
          sign-in, follow the "Accounts" steps in the README.
        </p>
      </section>
    );
  }

  return (
    <section className="card settings-section account-section">
      <h2>Account</h2>
      {!cloud.user ? (
        <>
          <p className="muted small">
            Sign in with Google to save your progress in your own Google Drive and pick it up on any device. Ascent
            creates an <strong>Ascent</strong> folder with a file per training day in <code>Ascent/workouts</code>, and
            can only see the files it creates there, not the rest of your Drive. Anything you've already done on
            this device comes with you.
          </p>
          <GoogleSignInButton />
        </>
      ) : (
        <>
          <div className="account-who">
            <Avatar user={cloud.user} size={44} />
            <div>
              <strong>{cloud.user.name ?? 'Signed in'}</strong>
              {cloud.user.email && <span className="muted small">{cloud.user.email}</span>}
            </div>
          </div>
          <p className={`sync-line is-${cloud.status}`}>
            <SyncIcon status={cloud.status} />
            {syncLabel(cloud.status, cloud.lastSyncedAt)}
          </p>
          <div className="button-row">
            {cloud.status === 'reconnect' && (
              <button className="btn btn--primary" onClick={() => void cloud.reconnect()}>
                <RefreshCw size={16} aria-hidden /> Reconnect Google Drive
              </button>
            )}
            {(cloud.status === 'error' || cloud.status === 'offline') && (
              <button className="btn" onClick={cloud.syncNow}>
                <RefreshCw size={16} aria-hidden /> Try again
              </button>
            )}
            {cloud.folderUrl && (
              <a className="btn" href={cloud.folderUrl} target="_blank" rel="noreferrer">
                <FolderOpen size={16} aria-hidden /> Open in Google Drive
              </a>
            )}
            <button className="btn" onClick={() => void cloud.signOut()}>
              <LogOut size={16} aria-hidden /> Sign out
            </button>
          </div>
        </>
      )}
      {cloud.error && <p className="callout callout--muted small">{cloud.error}</p>}
    </section>
  );
}
