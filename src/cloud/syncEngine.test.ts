import { describe, expect, it } from 'vitest';
import { initialProgress, sanitizeProgress, type LogEntry, type ProgressState } from '../state/progress';
import { fromDocs, toDocs } from './documents';
import { SyncEngine, type MetaStore, type ReconcileResult, type SyncMeta } from './syncEngine';
import { CloudAuthExpiredError, type CloudBackend, type CloudDocs, type SaveOps, type SyncStatus } from './types';

const log = (id: string, day = '2026-10-01'): LogEntry => ({ id, date: `${day}T10:00:00.000Z`, day, sets: 3, value: 5 });

/** An in-memory stand-in for Google Drive. */
function setup({
  local = initialProgress,
  remote = null as ProgressState | null,
  meta = null as SyncMeta | null,
} = {}) {
  const cloud = new Map<string, CloudDocs>();
  if (remote) cloud.set('u1', toDocs(remote));
  const saves: SaveOps[] = [];
  let failure: Error | null = null;

  const backend: CloudBackend = {
    kind: 'mock',
    onAuthChange: () => () => {},
    signIn: async () => {},
    signOut: async () => {},
    reconnect: async () => {},
    load: async (uid) => {
      if (failure) throw failure;
      return cloud.has(uid) ? structuredClone(cloud.get(uid)!) : null;
    },
    save: async (uid, ops) => {
      if (failure) throw failure;
      saves.push(ops);
      const docs = { ...(cloud.get(uid) ?? {}), ...structuredClone(ops.set) };
      for (const key of ops.remove) delete docs[key];
      cloud.set(uid, docs);
    },
  };

  let state = local;
  let storedMeta = meta;
  const statuses: SyncStatus[] = [];
  const results: ReconcileResult[] = [];
  const metaStore: MetaStore = {
    get: () => storedMeta,
    set: (m) => (storedMeta = m),
    clear: () => (storedMeta = null),
  };
  const engine = new SyncEngine(
    backend,
    'u1',
    {
      getState: () => state,
      replace: (s) => (state = sanitizeProgress(s)!),
      setStatus: (s) => statuses.push(s),
      onReconciled: (r) => results.push(r),
    },
    metaStore,
  );

  return {
    engine,
    saves,
    statuses,
    results,
    /** What the "Drive" holds, as progress. */
    cloudState: () => (cloud.has('u1') ? sanitizeProgress(fromDocs(cloud.get('u1')!))! : null),
    setCloud: (s: ProgressState) => cloud.set('u1', toDocs(s)),
    get state() {
      return state;
    },
    set state(s: ProgressState) {
      state = s;
    },
    get meta() {
      return storedMeta;
    },
    fail(error: Error | null) {
      failure = error;
    },
  };
}

const withData: ProgressState = {
  ...initialProgress,
  mastered: { pushup: '2026-01-01T00:00:00.000Z' },
  logs: { pushup: [log('local-1')] },
  onboarded: true,
};

const remoteData: ProgressState = {
  ...initialProgress,
  mastered: { dip: '2026-02-01T00:00:00.000Z' },
  logs: { dip: [log('remote-1', '2026-10-02')] },
  goals: ['pullup'],
  onboarded: true,
};

describe('SyncEngine: first sync after sign-in', () => {
  it('uploads this device’s progress to a new account', async () => {
    const t = setup({ local: withData });
    await t.engine.start();
    expect(t.results).toEqual(['uploaded']);
    expect(t.cloudState()!.logs.pushup).toEqual(withData.logs.pushup);
    expect(t.meta).toEqual({ uid: 'u1', dirty: false });
    expect(t.statuses.at(-1)).toBe('synced');
  });

  it('downloads the account onto a fresh device', async () => {
    const t = setup({ remote: remoteData });
    await t.engine.start();
    expect(t.results).toEqual(['downloaded']);
    expect(t.state.mastered).toEqual(remoteData.mastered);
    expect(t.saves).toHaveLength(0);
  });

  it('treats a clean copy of the same account as a cache and takes the cloud version', async () => {
    const t = setup({ local: withData, remote: remoteData, meta: { uid: 'u1', dirty: false } });
    await t.engine.start();
    expect(t.results).toEqual(['downloaded']);
    expect(t.state.mastered).toEqual(remoteData.mastered);
  });

  it('merges when the device and the account both have progress', async () => {
    const t = setup({ local: withData, remote: remoteData });
    await t.engine.start();
    expect(t.results).toEqual(['merged']);
    expect(Object.keys(t.state.mastered).sort()).toEqual(['dip', 'pushup']);
    expect(Object.keys(t.cloudState()!.logs).sort()).toEqual(['dip', 'pushup']);
  });

  it('merges changes this device never managed to upload', async () => {
    const t = setup({ local: withData, remote: remoteData, meta: { uid: 'u1', dirty: true } });
    await t.engine.start();
    expect(t.results).toEqual(['merged']);
  });

  it('never copies another account’s data into this one', async () => {
    const t = setup({ local: withData, meta: { uid: 'someone-else', dirty: false } });
    await t.engine.start();
    expect(t.state.logs).toEqual({});
    expect(t.cloudState()).toBeNull();
  });
});

describe('SyncEngine: after the first sync', () => {
  it('writes only the documents that changed', async () => {
    const t = setup({ local: withData, remote: withData, meta: { uid: 'u1', dirty: false } });
    await t.engine.start();
    expect(t.saves).toHaveLength(0);

    t.state = { ...t.state, logs: { ...t.state.logs, squat: [log('new', '2026-10-05')] } };
    await t.engine.flush();
    expect(Object.keys(t.saves.at(-1)!.set)).toEqual(['day:2026-10-05']);

    t.state = { ...t.state, logs: { squat: t.state.logs.squat } };
    await t.engine.flush();
    expect(t.saves.at(-1)).toEqual({ set: {}, remove: ['day:2026-10-01'] });
  });

  it('keeps failed changes marked as unsaved and retries them', async () => {
    const t = setup({ local: withData, remote: withData, meta: { uid: 'u1', dirty: false } });
    await t.engine.start();
    t.fail(new Error('network down'));
    t.state = { ...t.state, goals: ['dip'] };
    await t.engine.flush();
    expect(t.statuses.at(-1)).toBe('error');
    expect(t.meta?.dirty).toBe(true);

    t.fail(null);
    await t.engine.flush();
    expect(t.cloudState()!.goals).toEqual(['dip']);
    expect(t.meta?.dirty).toBe(false);
  });

  it('asks to reconnect when access expires, then saves what was waiting', async () => {
    const t = setup({ local: withData, remote: withData, meta: { uid: 'u1', dirty: false } });
    await t.engine.start();
    t.fail(new CloudAuthExpiredError());
    t.state = { ...t.state, goals: ['l-sit'] };
    await t.engine.flush();
    expect(t.statuses.at(-1)).toBe('reconnect');

    t.fail(null);
    await t.engine.resume();
    expect(t.cloudState()!.goals).toEqual(['l-sit']);
    expect(t.statuses.at(-1)).toBe('synced');
  });

  it('finishes the first sync on resume if access had already expired at start', async () => {
    const t = setup({ local: withData });
    t.fail(new CloudAuthExpiredError());
    await t.engine.start();
    expect(t.statuses.at(-1)).toBe('reconnect');
    expect(t.engine.isReady).toBe(false);
    t.fail(null);
    await t.engine.resume();
    expect(t.results).toEqual(['uploaded']);
  });

  it('picks up changes made on another device', async () => {
    const t = setup({ local: withData, remote: withData, meta: { uid: 'u1', dirty: false } });
    await t.engine.start();
    t.setCloud({ ...withData, goals: ['l-sit'] });
    await t.engine.refresh();
    expect(t.state.goals).toEqual(['l-sit']);
  });

  it('does not overwrite unsaved local changes when refreshing', async () => {
    const t = setup({ local: withData, remote: withData, meta: { uid: 'u1', dirty: false } });
    await t.engine.start();
    t.fail(new Error('network down'));
    t.state = { ...t.state, goals: ['dip'] };
    await t.engine.flush(); // fails, stays dirty
    t.fail(null);
    t.setCloud({ ...withData, goals: ['l-sit'] });
    await t.engine.refresh(); // pushes instead of pulling
    expect(t.state.goals).toEqual(['dip']);
    expect(t.cloudState()!.goals).toEqual(['dip']);
  });
});
