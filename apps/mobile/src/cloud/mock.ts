import type { CloudBackend, CloudDocs, CloudUser } from '@ascent/core/cloud/types';
import { readJson, writeJson } from '../state/storage';

/**
 * Fake accounts for development (EXPO_PUBLIC_CLOUD_MOCK=true): a "Test User" whose "Drive" is another key on
 * the device, like the web app's mock. Lets you try sign-in, syncing and sign-out without Google.
 */
const DB_KEY = 'ascent:mock-cloud';
const AUTH_KEY = 'ascent:mock-auth';

export const MOCK_USER: CloudUser = { uid: 'mock-user', name: 'Test User', email: 'test.user@example.com', photoURL: null };

const delay = () => new Promise((r) => setTimeout(r, 250));
const readDb = async () => ((await readJson(DB_KEY)) as Record<string, CloudDocs> | null) ?? {};

export async function createMockBackend(): Promise<CloudBackend> {
  const listeners = new Set<(u: CloudUser | null) => void>();
  let user: CloudUser | null = (await readJson(AUTH_KEY)) ? MOCK_USER : null;
  const emit = () => listeners.forEach((l) => l(user));

  return {
    kind: 'mock',
    onAuthChange(cb) {
      listeners.add(cb);
      setTimeout(() => listeners.has(cb) && cb(user), 0);
      return () => listeners.delete(cb);
    },
    async signIn() {
      await delay();
      await writeJson(AUTH_KEY, true);
      user = MOCK_USER;
      emit();
    },
    async reconnect() {
      await delay();
    },
    async signOut() {
      await writeJson(AUTH_KEY, null);
      user = null;
      emit();
    },
    async load(uid) {
      await delay();
      const docs = (await readDb())[uid];
      return docs && Object.keys(docs).length ? docs : null;
    },
    async save(uid, ops) {
      await delay();
      const db = await readDb();
      const docs = { ...(db[uid] ?? {}), ...ops.set };
      for (const key of ops.remove) delete docs[key];
      db[uid] = docs;
      await writeJson(DB_KEY, db);
    },
    folderUrl: () => null,
  };
}
