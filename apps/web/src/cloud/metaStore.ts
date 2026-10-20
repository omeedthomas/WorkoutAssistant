import type { MetaStore, SyncMeta } from '@ascent/core/cloud/syncEngine';

const META_KEY = 'ascent:sync:v1';

/** The sync engine's bookkeeping (which account, unsynced changes), kept in this browser's localStorage. */
export const localMetaStore: MetaStore = {
  get() {
    try {
      const m = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as SyncMeta | null;
      return m && typeof m.uid === 'string' ? { uid: m.uid, dirty: m.dirty === true } : null;
    } catch {
      return null;
    }
  },
  set(meta) {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch {
      // ignore
    }
  },
  clear() {
    try {
      localStorage.removeItem(META_KEY);
    } catch {
      // ignore
    }
  },
};
