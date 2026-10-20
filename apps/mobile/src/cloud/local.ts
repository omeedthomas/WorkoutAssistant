import type { ContentCache } from '@ascent/core/cloud/driveStore';
import type { MetaStore, SyncMeta } from '@ascent/core/cloud/syncEngine';
import { readJson, writeJson } from '../state/storage';

/**
 * Sync bookkeeping kept on the phone. Core reads these synchronously, so each is loaded once into memory and
 * written back to AsyncStorage in the background.
 */

const META_KEY = 'ascent:sync:v1';
const CACHE_KEY = 'ascent:drive-cache:v1';

/** Which account this phone last synced with, and whether it has changes Drive hasn't seen. */
export async function loadMetaStore(): Promise<MetaStore> {
  const raw = (await readJson(META_KEY)) as Partial<SyncMeta> | null;
  let meta: SyncMeta | null = raw && typeof raw.uid === 'string' ? { uid: raw.uid, dirty: raw.dirty === true } : null;
  return {
    get: () => meta,
    set(next) {
      meta = next;
      void writeJson(META_KEY, next);
    },
    clear() {
      meta = null;
      void writeJson(META_KEY, null);
    },
  };
}

type CacheEntry = { modifiedTime: string; content: unknown };

/** Drive file contents by file id and modified time, so unchanged days aren't downloaded again. */
export async function loadContentCache(): Promise<ContentCache & { clear(): void }> {
  const raw = await readJson(CACHE_KEY);
  let entries: Record<string, CacheEntry> = raw && typeof raw === 'object' ? (raw as Record<string, CacheEntry>) : {};
  const persist = () => void writeJson(CACHE_KEY, entries);
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
    clear() {
      entries = {};
      void writeJson(CACHE_KEY, null);
    },
  };
}
