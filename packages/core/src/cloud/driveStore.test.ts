import { describe, expect, it } from 'vitest';
import { createDriveStore, type ContentCache } from './driveStore';
import { CloudAuthExpiredError } from './types';

const FOLDER = 'application/vnd.google-apps.folder';

interface FakeFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  appProperties: Record<string, string>;
  modifiedTime: string;
  trashed: boolean;
  content: string;
}

/** Just enough of the Google Drive v3 REST API to exercise the store, checking request formats as it goes. */
function fakeDrive({ pageSize = 1000 } = {}) {
  const files = new Map<string, FakeFile>();
  const requests: { method: string; url: URL }[] = [];
  let nextId = 1;
  let clock = 0;
  let token = 'good';
  let failWith: { status: number; reason: string; message: string } | null = null;
  const tick = () => new Date(Date.UTC(2026, 9, 18, 0, 0, clock++)).toISOString();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const meta = (f: FakeFile) => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime, appProperties: f.appProperties });

  function matches(f: FakeFile, q: string) {
    if (/trashed=false/.test(q) && f.trashed) return false;
    if (q.includes(`mimeType='${FOLDER}'`) && f.mimeType !== FOLDER) return false;
    const kinds = [...q.matchAll(/key='ascent' and value='(\w+)'/g)].map((m) => m[1]);
    return kinds.includes(f.appProperties.ascent);
  }

  function parseMultipart(contentType: string, body: string) {
    const boundary = /boundary=(.+)$/.exec(contentType)![1];
    const parts = body.split(`--${boundary}`).slice(1, -1).map((p) => p.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''));
    expect(body.endsWith(`--${boundary}--`)).toBe(true);
    return { metadata: JSON.parse(parts[0]), content: parts[1] };
  }

  const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    requests.push({ method, url });
    const headers = init.headers as Record<string, string>;
    if (headers.Authorization !== `Bearer ${token}`) return json({ error: { code: 401 } }, 401);
    if (failWith) return json({ error: { message: failWith.message, errors: [{ reason: failWith.reason }] } }, failWith.status);

    const path = url.pathname;
    const idMatch = /\/files\/([^/]+)$/.exec(path);
    const existing = idMatch ? files.get(idMatch[1]) : undefined;
    if (idMatch && !existing) return json({ error: { code: 404, message: 'File not found' } }, 404);

    if (path === '/drive/v3/files' && method === 'GET') {
      const all = [...files.values()].filter((f) => matches(f, url.searchParams.get('q')!));
      const start = Number(url.searchParams.get('pageToken') ?? 0);
      const page = all.slice(start, start + pageSize);
      const more = start + pageSize < all.length;
      return json({ files: page.map(meta), ...(more && { nextPageToken: String(start + pageSize) }) });
    }
    if (path === '/drive/v3/files' && method === 'POST') {
      const body = JSON.parse(String(init.body));
      const f: FakeFile = { id: `f${nextId++}`, name: body.name, mimeType: body.mimeType, parents: body.parents ?? ['root'], appProperties: body.appProperties ?? {}, modifiedTime: tick(), trashed: false, content: '' };
      files.set(f.id, f);
      return json(meta(f));
    }
    if (path === '/upload/drive/v3/files' && method === 'POST') {
      expect(url.searchParams.get('uploadType')).toBe('multipart');
      const { metadata, content } = parseMultipart(headers['Content-Type'], String(init.body));
      const f: FakeFile = { id: `f${nextId++}`, name: metadata.name, mimeType: metadata.mimeType, parents: metadata.parents, appProperties: metadata.appProperties, modifiedTime: tick(), trashed: false, content };
      files.set(f.id, f);
      return json(meta(f));
    }
    if (existing && path.startsWith('/upload/drive/v3/files/') && method === 'PATCH') {
      const { metadata, content } = parseMultipart(headers['Content-Type'], String(init.body));
      if (metadata.name) existing.name = metadata.name;
      existing.content = content;
      existing.modifiedTime = tick();
      return json(meta(existing));
    }
    if (existing && method === 'PATCH') {
      Object.assign(existing, JSON.parse(String(init.body)));
      existing.modifiedTime = tick();
      return json({ id: existing.id });
    }
    if (existing && method === 'GET' && url.searchParams.get('alt') === 'media') return new Response(existing.content);
    throw new Error(`Unhandled ${method} ${url}`);
  };

  return {
    fetch: fetchImpl as typeof fetch,
    files,
    requests,
    byName: (name: string) => [...files.values()].find((f) => f.name === name),
    downloads: () => requests.filter((r) => r.url.searchParams.get('alt') === 'media').length,
    expireToken: () => (token = 'rotated'),
    failNext: (f: typeof failWith) => (failWith = f),
    editExternally(id: string, content: string) {
      const f = files.get(id)!;
      f.content = content;
      f.modifiedTime = tick();
    },
  };
}

function memoryCache(): ContentCache {
  const m = new Map<string, { modifiedTime: string; content: unknown }>();
  return { get: (id) => m.get(id), set: (id, e) => void m.set(id, e), retain: (ids) => [...m.keys()].forEach((k) => !ids.has(k) && m.delete(k)) };
}

function setup(opts: { pageSize?: number } = {}) {
  const drive = fakeDrive(opts);
  let unauthorized = 0;
  const store = createDriveStore({
    fetch: drive.fetch,
    getToken: async () => 'good',
    onUnauthorized: () => unauthorized++,
    cache: memoryCache(),
    retryDelayMs: 0,
  });
  return { drive, store, unauthorized: () => unauthorized };
}

const progress = { app: 'Ascent', kind: 'progress', version: 1, mastered: { pushup: 'x' }, goals: [], onboarded: true };
const day = (date: string, title = 'Push + Pull') => ({ app: 'Ascent', kind: 'workout-day', version: 1, date, title, workouts: [], sessions: [{ id: date, exercise: 'pushup' }] });

describe('Drive store', () => {
  it('has nothing to load for a new account', async () => {
    const { store } = setup();
    expect(await store.load()).toBeNull();
  });

  it('creates My Drive/Ascent/workouts and readable, well-named files', async () => {
    const { store, drive } = setup();
    await store.save({ set: { progress, 'day:2026-10-18': day('2026-10-18') }, remove: [] });

    const root = drive.byName('Ascent')!;
    const workouts = drive.byName('workouts')!;
    expect(root).toMatchObject({ mimeType: FOLDER, parents: ['root'] });
    expect(workouts).toMatchObject({ mimeType: FOLDER, parents: [root.id] });
    expect(drive.byName('progress.json')!.parents).toEqual([root.id]);
    const file = drive.byName('2026-10-18 Push + Pull.json')!;
    expect(file.parents).toEqual([workouts.id]);
    expect(file.appProperties).toEqual({ ascent: 'day', day: '2026-10-18' });
    expect(file.content).toBe(JSON.stringify(day('2026-10-18'), null, 2));
    expect(store.folderUrl()).toBe(`https://drive.google.com/drive/folders/${root.id}`);
  });

  it('creates each folder only once when saving many days at once', async () => {
    const { store, drive } = setup();
    const set = Object.fromEntries([1, 2, 3, 4, 5, 6].map((d) => [`day:2026-10-0${d}`, day(`2026-10-0${d}`)]));
    await store.save({ set, remove: [] });
    expect([...drive.files.values()].filter((f) => f.mimeType === FOLDER)).toHaveLength(2);
  });

  it('loads every document back', async () => {
    const { store } = setup();
    await store.save({ set: { progress, 'day:2026-10-18': day('2026-10-18') }, remove: [] });
    expect(await setup().store.load()).toBeNull(); // a different Drive
    expect(await store.load()).toEqual({ progress, 'day:2026-10-18': day('2026-10-18') });
  });

  it('finds files by app properties, even after renaming or moving them in Drive', async () => {
    const { store, drive } = setup();
    await store.save({ set: { 'day:2026-10-18': day('2026-10-18') }, remove: [] });
    const file = drive.byName('2026-10-18 Push + Pull.json')!;
    file.name = 'my favourite day.json';
    file.parents = ['somewhere-else'];
    expect(Object.keys((await store.load())!)).toEqual(['day:2026-10-18']);
    await store.save({ set: { 'day:2026-10-18': day('2026-10-18', 'Push + Pull') }, remove: [] });
    expect([...drive.files.values()].filter((f) => f.appProperties.ascent === 'day')).toHaveLength(1);
  });

  it('renames a day file when its workout changes', async () => {
    const { store, drive } = setup();
    await store.save({ set: { 'day:2026-10-18': day('2026-10-18', 'Training') }, remove: [] });
    const id = drive.byName('2026-10-18 Training.json')!.id;
    await store.save({ set: { 'day:2026-10-18': day('2026-10-18', 'Legs + Core') }, remove: [] });
    expect(drive.files.get(id)!.name).toBe('2026-10-18 Legs + Core.json');
  });

  it('moves removed days to the trash', async () => {
    const { store, drive } = setup();
    await store.save({ set: { 'day:2026-10-18': day('2026-10-18') }, remove: [] });
    await store.save({ set: {}, remove: ['day:2026-10-18'] });
    expect(drive.byName('2026-10-18 Push + Pull.json')!.trashed).toBe(true);
    expect(await store.load()).toBeNull();
  });

  it('only downloads files that changed since the last load', async () => {
    const { store, drive } = setup();
    await store.save({ set: { progress, 'day:2026-10-17': day('2026-10-17'), 'day:2026-10-18': day('2026-10-18') }, remove: [] });
    await store.load();
    expect(drive.downloads()).toBe(0); // everything we wrote is already cached

    const edited = { ...day('2026-10-18'), title: 'Edited in Drive' };
    drive.editExternally(drive.byName('2026-10-18 Push + Pull.json')!.id, JSON.stringify(edited));
    const docs = await store.load();
    expect(drive.downloads()).toBe(1);
    expect(docs!['day:2026-10-18']).toEqual(edited);
  });

  it('follows pagination', async () => {
    const { store } = setup({ pageSize: 2 });
    const set = Object.fromEntries([1, 2, 3, 4, 5].map((d) => [`day:2026-10-0${d}`, day(`2026-10-0${d}`)]));
    await store.save({ set, remove: [] });
    expect(Object.keys((await store.load())!)).toHaveLength(5);
  });

  it('recreates a file that was deleted in Drive', async () => {
    const { store, drive } = setup();
    await store.save({ set: { 'day:2026-10-18': day('2026-10-18') }, remove: [] });
    drive.files.delete(drive.byName('2026-10-18 Push + Pull.json')!.id);
    await store.save({ set: { 'day:2026-10-18': day('2026-10-18', 'Again') }, remove: [] });
    expect(drive.byName('2026-10-18 Again.json')).toBeDefined();
  });

  it('skips a file that was hand-edited into invalid JSON', async () => {
    const { store, drive } = setup();
    await store.save({ set: { progress, 'day:2026-10-18': day('2026-10-18') }, remove: [] });
    drive.editExternally(drive.byName('2026-10-18 Push + Pull.json')!.id, '{ oops');
    expect(Object.keys((await store.load())!)).toEqual(['progress']);
  });

  it('reports an expired token so the app can ask to reconnect', async () => {
    const { store, drive, unauthorized } = setup();
    drive.expireToken();
    await expect(store.load()).rejects.toBeInstanceOf(CloudAuthExpiredError);
    expect(unauthorized()).toBe(1);
  });

  it('explains when the Drive API is not enabled for the project', async () => {
    const { store, drive } = setup();
    drive.failNext({ status: 403, reason: 'accessNotConfigured', message: 'Google Drive API has not been used in project 123' });
    await expect(store.load()).rejects.toMatchObject({ code: 'drive/api-disabled' });
  });
});
