import { CloudAuthExpiredError, type CloudBackend, type CloudDocs, type CloudUser } from './types';

/**
 * Fake accounts for development (VITE_CLOUD_MOCK=true): a "Test User" whose
 * "Drive" is another localStorage key. Lets you try sign-in, syncing, an
 * expired connection (set localStorage "ascent:mock-expired" to "1") and
 * sign-out without Google. Never included in production builds.
 */
const DB_KEY = 'ascent:mock-cloud';
const AUTH_KEY = 'ascent:mock-auth';
const EXPIRED_KEY = 'ascent:mock-expired';

export const MOCK_USER: CloudUser = {
  uid: 'mock-user',
  name: 'Test User',
  email: 'test.user@example.com',
  photoURL: null,
};

const read = (): Record<string, CloudDocs> => JSON.parse(localStorage.getItem(DB_KEY) ?? '{}');
const delay = () => new Promise((r) => setTimeout(r, 250));
const checkAccess = () => {
  if (localStorage.getItem(EXPIRED_KEY) === '1') throw new CloudAuthExpiredError();
};

export function createMockBackend(): CloudBackend {
  const listeners = new Set<(u: CloudUser | null) => void>();
  const current = () => (localStorage.getItem(AUTH_KEY) ? MOCK_USER : null);
  const emit = () => listeners.forEach((l) => l(current()));

  return {
    kind: 'mock',
    onAuthChange(cb) {
      listeners.add(cb);
      setTimeout(() => cb(current()), 0);
      return () => listeners.delete(cb);
    },
    async signIn() {
      await delay();
      localStorage.setItem(AUTH_KEY, '1');
      localStorage.removeItem(EXPIRED_KEY);
      emit();
    },
    async reconnect() {
      await delay();
      localStorage.removeItem(EXPIRED_KEY);
    },
    async signOut() {
      localStorage.removeItem(AUTH_KEY);
      emit();
    },
    async load(uid) {
      await delay();
      checkAccess();
      const docs = read()[uid];
      return docs && Object.keys(docs).length ? docs : null;
    },
    async save(uid, ops) {
      await delay();
      checkAccess();
      const db = read();
      const docs = { ...(db[uid] ?? {}), ...ops.set };
      for (const key of ops.remove) delete docs[key];
      db[uid] = docs;
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    },
    folderUrl: () => null,
  };
}
