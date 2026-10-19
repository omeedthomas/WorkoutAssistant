import { createDriveStore, type ContentCache } from './driveStore';
import { CloudAuthExpiredError, CloudError, type CloudBackend, type CloudUser } from './types';

/**
 * Google sign-in (Google Identity Services, token model) + storage in the
 * user's own Google Drive. No server: the browser gets a short-lived access
 * token (about an hour) for the `drive.file` scope, which only lets the app see
 * files it created. There's no refresh token without a server, and Google only
 * hands out a new token in response to a tap, so CloudContext renews it on the
 * user's next tap when it's about to expire (no prompt, since consent is
 * remembered). Until then, changes wait on the device.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SCOPES = `openid email profile ${DRIVE_SCOPE}`;
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

const TOKEN_KEY = 'ascent:google-token';
const USER_KEY = 'ascent:google-user';
const CACHE_KEY = 'ascent:drive-cache:v1';

// ---- Minimal types for the parts of Google Identity Services we use ----
interface TokenResponse {
  access_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string; login_hint?: string }): void;
}
interface Oauth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
    error_callback?: (e: { type: string; message?: string }) => void;
  }): TokenClient;
  hasGrantedAllScopes(response: TokenResponse, scope: string, ...rest: string[]): boolean;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: Oauth2 } };
  }
}

function loadGis(): Promise<Oauth2> {
  const ready = window.google?.accounts?.oauth2;
  if (ready) return Promise.resolve(ready);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (oauth2) resolve(oauth2);
      else reject(new CloudError('auth/gis-unavailable'));
    };
    script.onerror = () => reject(new CloudError('auth/gis-unavailable', "Couldn't load Google sign-in."));
    document.head.appendChild(script);
  });
}

const read = <T,>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked
  }
};

/** File contents keyed by Drive file id + modified time, so unchanged days aren't downloaded again. */
function localContentCache(): ContentCache {
  let entries = read<Record<string, { modifiedTime: string; content: unknown }>>(CACHE_KEY) ?? {};
  const persist = () => write(CACHE_KEY, entries);
  return {
    get: (id) => entries[id],
    set(id, entry) {
      entries[id] = entry;
      persist();
    },
    retain(ids) {
      entries = Object.fromEntries(Object.entries(entries).filter(([id]) => ids.has(id)));
      persist();
    },
  };
}

export function createDriveBackend(clientId: string): CloudBackend {
  const listeners = new Set<(u: CloudUser | null) => void>();
  let user = read<CloudUser>(USER_KEY);
  const emit = () => listeners.forEach((l) => l(user));

  // Load Google's script right away so the popup can open straight from the click (popup blockers allow that).
  const gis = loadGis();
  gis.catch(() => {});
  let client: TokenClient | null = null;
  let pending: { resolve: (r: TokenResponse) => void; reject: (e: unknown) => void } | null = null;

  async function requestToken(prompt: string, hint?: string): Promise<TokenResponse> {
    const oauth2 = await gis;
    client ??= oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (r) => {
        if (r.error) pending?.reject(new CloudError(`auth/${r.error}`, r.error_description));
        else pending?.resolve(r);
        pending = null;
      },
      error_callback: (e) => {
        const code = e.type === 'popup_closed' ? 'auth/popup-closed-by-user' : e.type === 'popup_failed_to_open' ? 'auth/popup-blocked' : 'auth/unknown';
        pending?.reject(new CloudError(code, e.message));
        pending = null;
      },
    });
    pending?.reject(new CloudError('auth/cancelled-popup-request'));
    return new Promise((resolve, reject) => {
      pending = { resolve, reject };
      client!.requestAccessToken({ prompt, ...(hint && { login_hint: hint }) });
    }).then(async (r) => {
      const response = r as TokenResponse;
      if (!response.access_token || !oauth2.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
        throw new CloudError('auth/drive-permission');
      }
      const expiresIn = Number(response.expires_in) || 3600;
      write(TOKEN_KEY, { token: response.access_token, expiresAt: Date.now() + expiresIn * 1000 });
      return response;
    });
  }

  async function fetchUser(token: string): Promise<CloudUser> {
    const res = await fetch(USERINFO, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new CloudError('auth/userinfo', "Couldn't read your Google profile.");
    const info = await res.json();
    return { uid: info.sub, name: info.name ?? null, email: info.email ?? null, photoURL: info.picture ?? null };
  }

  async function getToken(): Promise<string> {
    const stored = read<{ token: string; expiresAt: number }>(TOKEN_KEY);
    if (stored && stored.expiresAt - 60_000 > Date.now()) return stored.token;
    throw new CloudAuthExpiredError();
  }

  const store = createDriveStore({
    fetch: (...args) => fetch(...args),
    getToken,
    onUnauthorized: () => write(TOKEN_KEY, null),
    cache: localContentCache(),
  });

  async function adopt(response: TokenResponse) {
    const next = await fetchUser(response.access_token!);
    if (next.uid !== user?.uid || next.name !== user?.name || next.photoURL !== user?.photoURL) {
      user = next;
      write(USER_KEY, user);
      emit();
    }
  }

  return {
    kind: 'google-drive',
    onAuthChange(cb) {
      listeners.add(cb);
      setTimeout(() => cb(user), 0);
      return () => listeners.delete(cb);
    },
    async signIn() {
      await adopt(await requestToken('select_account'));
    },
    async reconnect() {
      await adopt(await requestToken('', user?.email ?? undefined));
    },
    accessExpiresAt: () => read<{ token: string; expiresAt: number }>(TOKEN_KEY)?.expiresAt ?? null,
    async signOut() {
      write(TOKEN_KEY, null);
      write(USER_KEY, null);
      write(CACHE_KEY, null);
      user = null;
      emit();
    },
    load: () => store.load(),
    save: (_uid, ops) => store.save(ops),
    folderUrl: () => store.folderUrl(),
    locateFolder: () => store.locateFolder(),
  };
}
