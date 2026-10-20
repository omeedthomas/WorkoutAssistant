import { GoogleSignin, isErrorWithCode, statusCodes, type User } from '@react-native-google-signin/google-signin';
import { createDriveStore } from '@ascent/core/cloud/driveStore';
import { CloudAuthExpiredError, CloudError, type CloudBackend, type CloudUser } from '@ascent/core/cloud/types';
import { loadContentCache } from './local';

/**
 * Google sign-in with the native SDKs + storage in the user's own Google Drive (core's driveStore), with the
 * same `drive.file` scope and the same files as the web app. Unlike the browser, the phone keeps a refresh
 * token, so access renews by itself and there's no hourly reconnect.
 */

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const toUser = ({ user }: User): CloudUser => ({ uid: user.id, name: user.name, email: user.email, photoURL: user.photo });
const hasDrive = (u: User) => u.scopes.includes(DRIVE_SCOPE);

/** Turns the native module's errors into the codes the app explains (see describeCloudError). */
function signInError(e: unknown): unknown {
  if (!isErrorWithCode(e)) return e;
  switch (e.code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return new CloudError('auth/cancelled');
    case statusCodes.IN_PROGRESS:
      return new CloudError('auth/in-progress');
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return new CloudError('auth/play-services', e.message);
    // Android's DEVELOPER_ERROR: the app's package name or signing key doesn't match an Android OAuth client.
    case '10':
    case 'DEVELOPER_ERROR':
      return new CloudError('auth/misconfigured', e.message);
    default:
      return new CloudError(`auth/${e.code}`, e.message);
  }
}

export async function createGoogleBackend(webClientId: string, iosClientId: string | null): Promise<CloudBackend> {
  GoogleSignin.configure({ webClientId, scopes: [DRIVE_SCOPE], ...(iosClientId && { iosClientId }) });
  const cache = await loadContentCache();
  const listeners = new Set<(u: CloudUser | null) => void>();
  let user: CloudUser | null = null;
  const emit = () => listeners.forEach((l) => l(user));

  // Pick up a previous sign-in without showing anything.
  const restored = (async () => {
    if (!GoogleSignin.hasPreviousSignIn()) return;
    try {
      const r = await GoogleSignin.signInSilently();
      if (r.type === 'success' && hasDrive(r.data)) user = toUser(r.data);
    } catch {
      // offline or the grant was revoked: stay signed out until the user signs in again
    }
  })();

  let lastToken: string | null = null;
  const store = createDriveStore({
    fetch: (input, init) => fetch(input, init),
    async getToken() {
      try {
        const { accessToken } = await GoogleSignin.getTokens();
        lastToken = accessToken;
        return accessToken;
      } catch {
        throw new CloudAuthExpiredError();
      }
    },
    // Google rejected the token: drop it so the next getTokens() fetches a fresh one (Android caches it).
    onUnauthorized() {
      if (lastToken) void GoogleSignin.clearCachedAccessToken(lastToken).catch(() => {});
      lastToken = null;
    },
    cache,
  });

  /** Interactive sign-in that ends with Drive access, asking again if the Drive permission was left unticked. */
  async function interactiveSignIn(): Promise<void> {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const r = await GoogleSignin.signIn();
      if (r.type === 'cancelled') throw new CloudError('auth/cancelled');
      let data = r.data;
      if (!hasDrive(data)) {
        const more = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
        if (more?.type === 'success') data = more.data;
      }
      if (!hasDrive(data)) {
        await GoogleSignin.signOut();
        throw new CloudError('auth/drive-permission');
      }
      user = toUser(data);
      emit();
    } catch (e) {
      throw e instanceof CloudError ? e : signInError(e);
    }
  }

  return {
    kind: 'google-drive',
    onAuthChange(cb) {
      listeners.add(cb);
      void restored.then(() => listeners.has(cb) && cb(user));
      return () => listeners.delete(cb);
    },
    signIn: interactiveSignIn,
    /** Access is normally renewed by the SDK; this restores it silently, or asks to sign in again. */
    async reconnect() {
      try {
        const r = await GoogleSignin.signInSilently();
        if (r.type === 'success' && hasDrive(r.data)) {
          lastToken = null;
          return;
        }
      } catch {
        // fall through to an interactive sign-in
      }
      await interactiveSignIn();
    },
    async signOut() {
      try {
        await GoogleSignin.signOut();
      } finally {
        cache.clear();
        user = null;
        emit();
      }
    },
    load: () => store.load(),
    save: (_uid, ops) => store.save(ops),
    folderUrl: () => store.folderUrl(),
    locateFolder: () => store.locateFolder(),
  };
}
