import { sanitizeProgress, type ProgressState } from '../state/progress';
import { diffDocs, fromDocs } from './documents';
import { emptyProgress, isPristine, mergeProgress, sameProgress } from './merge';
import type { CloudBackend, SyncStatus } from './types';

/** Which account this device last synced with, and whether it has changes the cloud hasn't seen. */
export interface SyncMeta {
  uid: string;
  dirty: boolean;
}

export interface MetaStore {
  get(): SyncMeta | null;
  set(meta: SyncMeta): void;
  clear(): void;
}

export type ReconcileResult = 'uploaded' | 'downloaded' | 'merged' | 'unchanged';

interface Hooks {
  getState(): ProgressState;
  replace(state: ProgressState): void;
  setStatus(status: SyncStatus): void;
  onReconciled?(result: ReconcileResult): void;
  onError?(error: unknown): void;
  /** Whether the device knows it has no connection, so a failure shows as "offline" rather than an error. */
  isOffline?(): boolean;
}

const PUSH_DELAY_MS = 1200;

const isExpired = (e: unknown) => (e as { code?: string })?.code === 'auth/expired';

/**
 * Keeps this device's progress and the signed-in account in step.
 *
 * - On sign-in it reconciles: upload if the account is new, download if this
 *   device has nothing (or only a stale copy of this same account), and merge
 *   if both have progress, so nothing is lost.
 * - After that, every local change is compared with what the cloud has and
 *   only the changed documents (e.g. today's workout file) are written.
 * - Coming back to the app re-reads the cloud to pick up other devices' changes.
 * - If access expires, changes wait on the device until `resume()` after a reconnect.
 */
export class SyncEngine {
  private synced: ProgressState = emptyProgress;
  private ready = false;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private backend: CloudBackend,
    private uid: string,
    private hooks: Hooks,
    private meta: MetaStore,
  ) {}

  private fail(error: unknown) {
    if (this.stopped) return;
    if (isExpired(error)) this.hooks.setStatus('reconnect');
    else this.hooks.setStatus(this.hooks.isOffline?.() ? 'offline' : 'error');
    this.hooks.onError?.(error);
  }

  private async loadRemote(): Promise<ProgressState | null> {
    const docs = await this.backend.load(this.uid);
    return docs ? (sanitizeProgress(fromDocs(docs)) ?? emptyProgress) : null;
  }

  async start(): Promise<void> {
    this.hooks.setStatus('syncing');
    try {
      const remote = await this.loadRemote();
      if (this.stopped) return;
      const local = this.hooks.getState();
      const meta = this.meta.get();

      let next: ProgressState;
      let result: ReconcileResult;
      if (meta && meta.uid !== this.uid) {
        // This device's data belongs to a different account: never copy it into this one.
        next = remote ?? emptyProgress;
        result = 'downloaded';
      } else if (!remote) {
        next = local;
        result = isPristine(local) ? 'unchanged' : 'uploaded';
      } else if ((meta?.uid === this.uid && !meta.dirty) || isPristine(local)) {
        next = remote;
        result = sameProgress(remote, local) ? 'unchanged' : 'downloaded';
      } else {
        next = mergeProgress(local, remote);
        result = sameProgress(next, remote) ? 'unchanged' : 'merged';
      }

      this.synced = remote ?? emptyProgress;
      this.ready = true;
      if (!sameProgress(next, local)) this.hooks.replace(next);
      await this.flush(next);
      if (!this.stopped) this.hooks.onReconciled?.(result);
    } catch (error) {
      this.fail(error);
    }
  }

  get isReady() {
    return this.ready;
  }

  /** Call after every local change; writes are batched. */
  schedulePush(): void {
    if (!this.ready || this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), PUSH_DELAY_MS);
  }

  /** Writes whatever differs from the cloud right now. */
  flush(state?: ProgressState): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.queue = this.queue.then(async () => {
      if (!this.ready || this.stopped) return;
      const target = state ?? this.hooks.getState();
      const ops = diffDocs(this.synced, target);
      if (!ops) {
        this.meta.set({ uid: this.uid, dirty: false });
        this.hooks.setStatus('synced');
        return;
      }
      // Marked dirty first, so a reload before the write lands merges instead of overwriting.
      this.meta.set({ uid: this.uid, dirty: true });
      this.hooks.setStatus('syncing');
      try {
        await this.backend.save(this.uid, ops);
        this.synced = target;
        this.meta.set({ uid: this.uid, dirty: false });
        if (!this.stopped) this.hooks.setStatus('synced');
      } catch (error) {
        this.fail(error);
      }
    });
    return this.queue;
  }

  /** After a reconnect (or coming back online): finish the first sync, or push what's waiting. */
  resume(): Promise<void> {
    return this.ready ? this.flush() : this.start();
  }

  /** Pull changes made on other devices. Local unsaved changes are pushed instead of being overwritten. */
  async refresh(): Promise<void> {
    if (!this.ready || this.stopped) return;
    if (this.timer || this.meta.get()?.dirty) return this.flush();
    try {
      const remote = (await this.loadRemote()) ?? emptyProgress;
      if (this.stopped || this.timer || sameProgress(remote, this.synced)) return;
      this.synced = remote;
      if (!sameProgress(remote, this.hooks.getState())) this.hooks.replace(remote);
      this.hooks.setStatus('synced');
    } catch (error) {
      if (isExpired(error)) this.fail(error);
      // Otherwise refreshing is best-effort; the next write reports problems.
    }
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
  }
}
