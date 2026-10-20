import { dayOfKey, PROGRESS_KEY } from './documents';
import { CloudAuthExpiredError, CloudError, type CloudDocs, type SaveOps } from './types';

/**
 * Reads and writes Ascent's files in the user's Google Drive (REST API v3):
 *
 *   My Drive/Ascent/                      folder   appProperties { ascent: 'root' }
 *   My Drive/Ascent/progress.json                  appProperties { ascent: 'progress' }
 *   My Drive/Ascent/workouts/                     folder   appProperties { ascent: 'workouts' }
 *   My Drive/Ascent/workouts/<day> <title>.json   appProperties { ascent: 'day', day }
 *
 * Files are found by their app properties, not their names, so renaming or
 * moving them in Drive is fine. With the drive.file scope the app can only see
 * files it created. Removed days go to the Drive trash rather than being deleted.
 */

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';
const FIELDS = 'id,name,modifiedTime,appProperties';

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  appProperties?: Record<string, string>;
}

export interface ContentCache {
  get(fileId: string): { modifiedTime: string; content: unknown } | undefined;
  set(fileId: string, entry: { modifiedTime: string; content: unknown }): void;
  /** Forget entries for files that no longer exist. */
  retain(fileIds: Set<string>): void;
}

export interface DriveStoreOptions {
  fetch: typeof fetch;
  /** A valid access token; throws CloudAuthExpiredError when there isn't one. */
  getToken: () => Promise<string>;
  /** Called when Google rejects the token, so it can be discarded. */
  onUnauthorized?: () => void;
  cache?: ContentCache;
  /** Pause before retrying rate-limited or failed requests (tests pass 0). */
  retryDelayMs?: number;
}

type FolderKind = 'root' | 'workouts';

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) await fn(queue.shift()!);
    }),
  );
}

const prop = (key: string, value: string) => `appProperties has { key='${key}' and value='${value}' }`;

/** Drive allows almost anything in names; just keep them on one line and reasonably short. */
const cleanName = (s: string) => s.replace(/[\r\n/\\]+/g, ' ').slice(0, 120).trim();

export function fileNameFor(key: string, doc: unknown): string {
  if (key === PROGRESS_KEY) return 'progress.json';
  const title = (doc as { title?: unknown })?.title;
  return `${dayOfKey(key)} ${cleanName(typeof title === 'string' && title ? title : 'Training')}.json`;
}

export function createDriveStore(opts: DriveStoreOptions) {
  const retryDelay = opts.retryDelayMs ?? 600;
  let folders: Partial<Record<FolderKind, Promise<string>>> = {};
  let rootId: string | null = null;
  const index = new Map<string, DriveFile>(); // document key → Drive file

  async function driveError(res: Response): Promise<CloudError> {
    let reason = '';
    let message = `Google Drive returned an error (${res.status}).`;
    try {
      const body = await res.json();
      reason = body?.error?.errors?.[0]?.reason ?? body?.error?.details?.[0]?.reason ?? '';
      message = body?.error?.message ?? message;
    } catch {
      // not JSON
    }
    if (reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED' || /has not been used|is disabled/i.test(message)) {
      return new CloudError('drive/api-disabled', message);
    }
    if (reason === 'storageQuotaExceeded') return new CloudError('drive/quota', message);
    if (reason === 'insufficientPermissions' || reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT') {
      return new CloudError('auth/drive-permission', message);
    }
    return new CloudError(`drive/${res.status}`, message);
  }

  async function request(url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
    const token = await opts.getToken();
    let res: Response;
    try {
      res = await opts.fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
    } catch {
      throw new CloudError('network', "Couldn't reach Google Drive.");
    }
    if (res.status === 401) {
      opts.onUnauthorized?.();
      throw new CloudAuthExpiredError();
    }
    const retryable = res.status === 429 || res.status >= 500 || (res.status === 403 && /rateLimit/i.test(res.statusText));
    if (retryable && attempt < 2) {
      await new Promise((r) => setTimeout(r, retryDelay * 2 ** attempt));
      return request(url, init, attempt + 1);
    }
    if (!res.ok) throw await driveError(res);
    return res;
  }

  async function list(q: string): Promise<DriveFile[]> {
    const files: DriveFile[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ q, fields: `nextPageToken,files(${FIELDS})`, pageSize: '1000', spaces: 'drive' });
      if (pageToken) params.set('pageToken', pageToken);
      const body = await (await request(`${API}/files?${params}`)).json();
      files.push(...((body.files as DriveFile[]) ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return files;
  }

  function ensureFolder(kind: FolderKind): Promise<string> {
    // Memoised promise, so parallel writes don't create the folder twice.
    folders[kind] ??= (async () => {
      const parent = kind === 'workouts' ? await ensureFolder('root') : undefined;
      const [found] = await list(`${prop('ascent', kind)} and mimeType='${FOLDER}' and trashed=false`);
      const id =
        found?.id ??
        (
          await (
            await request(`${API}/files?fields=${FIELDS}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: kind === 'root' ? 'Ascent' : 'workouts',
                mimeType: FOLDER,
                appProperties: { ascent: kind },
                ...(parent && { parents: [parent] }),
              }),
            })
          ).json()
        ).id;
      if (kind === 'root') rootId = id;
      return id as string;
    })().catch((e) => {
      delete folders[kind];
      throw e;
    });
    return folders[kind]!;
  }

  function multipart(metadata: object, content: string) {
    const boundary = `ascent-${Math.random().toString(36).slice(2)}`;
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
    return { body, headers: { 'Content-Type': `multipart/related; boundary=${boundary}` } };
  }

  async function write(key: string, doc: unknown, retried = false): Promise<void> {
    const content = JSON.stringify(doc, null, 2);
    const name = fileNameFor(key, doc);
    const existing = index.get(key);
    let file: DriveFile;
    try {
      if (existing) {
        const { body, headers } = multipart(existing.name === name ? {} : { name }, content);
        file = await (
          await request(`${UPLOAD}/files/${existing.id}?uploadType=multipart&fields=${FIELDS}`, { method: 'PATCH', headers, body })
        ).json();
      } else {
        const day = dayOfKey(key);
        const parent = await ensureFolder(day ? 'workouts' : 'root');
        const { body, headers } = multipart(
          {
            name,
            mimeType: 'application/json',
            parents: [parent],
            appProperties: day ? { ascent: 'day', day } : { ascent: 'progress' },
          },
          content,
        );
        file = await (await request(`${UPLOAD}/files?uploadType=multipart&fields=${FIELDS}`, { method: 'POST', headers, body })).json();
      }
    } catch (e) {
      // The file (or its folder) was deleted in Drive since we last looked: start over once.
      if ((e as CloudError).code === 'drive/404' && !retried) {
        index.delete(key);
        folders = {};
        return write(key, doc, true);
      }
      throw e;
    }
    index.set(key, file);
    opts.cache?.set(file.id, { modifiedTime: file.modifiedTime, content: doc });
  }

  async function remove(key: string): Promise<void> {
    const existing = index.get(key);
    if (!existing) return;
    try {
      await request(`${API}/files/${existing.id}?fields=id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      });
    } catch (e) {
      if ((e as CloudError).code !== 'drive/404') throw e;
    }
    index.delete(key);
  }

  return {
    /** Every Ascent document in the user's Drive, or null if there are none. */
    async load(): Promise<CloudDocs | null> {
      const files = await list(`(${prop('ascent', 'progress')} or ${prop('ascent', 'day')}) and trashed=false`);
      index.clear();
      for (const f of files) {
        const kind = f.appProperties?.ascent;
        const key = kind === 'progress' ? PROGRESS_KEY : kind === 'day' && f.appProperties?.day ? `day:${f.appProperties.day}` : null;
        if (!key) continue;
        // The same document twice (two devices created it at once): use the newest.
        const prev = index.get(key);
        if (!prev || f.modifiedTime > prev.modifiedTime) index.set(key, f);
      }
      if (index.size === 0) return null;

      const docs: CloudDocs = {};
      await mapLimit([...index], 6, async ([key, f]) => {
        const cached = opts.cache?.get(f.id);
        if (cached && cached.modifiedTime === f.modifiedTime) {
          docs[key] = cached.content;
          return;
        }
        const text = await (await request(`${API}/files/${f.id}?alt=media`)).text();
        try {
          const content = JSON.parse(text);
          docs[key] = content;
          opts.cache?.set(f.id, { modifiedTime: f.modifiedTime, content });
        } catch {
          // A file edited by hand into invalid JSON: leave it alone.
        }
      });
      opts.cache?.retain(new Set([...index.values()].map((f) => f.id)));
      return docs;
    },

    async save(ops: SaveOps): Promise<void> {
      const entries = Object.entries(ops.set);
      // Write one first so the folders exist, then the rest a few at a time.
      if (entries.length) await write(...entries[0]);
      await mapLimit(entries.slice(1), 4, ([key, doc]) => write(key, doc));
      await mapLimit(ops.remove, 4, remove);
    },

    /** Link to the Ascent folder, once it's known. */
    folderUrl(): string | null {
      return rootId ? `https://drive.google.com/drive/folders/${rootId}` : null;
    },

    /** Find the folder id without creating anything (for the "Open in Drive" link). */
    async locateFolder(): Promise<void> {
      if (rootId) return;
      const [found] = await list(`${prop('ascent', 'root')} and mimeType='${FOLDER}' and trashed=false`);
      if (found) {
        rootId = found.id;
        folders.root ??= Promise.resolve(found.id);
      }
    },
  };
}

export type DriveStore = ReturnType<typeof createDriveStore>;
