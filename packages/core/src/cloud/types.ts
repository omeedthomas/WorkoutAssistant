export interface CloudUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Saved progress as separate documents: `progress` (mastered skills, goals) and
 * one `day:YYYY-MM-DD` per training day. Each becomes a file in Google Drive.
 */
export type CloudDocs = Record<string, unknown>;

/** Documents to create or overwrite, and documents to remove. */
export interface SaveOps {
  set: CloudDocs;
  remove: string[];
}

/** Where accounts and saved progress live (Google Drive in production, a fake in dev/tests). */
export interface CloudBackend {
  readonly kind: 'google-drive' | 'mock';
  onAuthChange(cb: (user: CloudUser | null) => void): () => void;
  /** Interactive sign-in; call from a click. */
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Renew access after it expired; call from a click (it may open a brief Google window). */
  reconnect(): Promise<void>;
  /** When the current access runs out (ms since epoch), or null if there's none. */
  accessExpiresAt?(): number | null;
  /** All saved documents, or null if this account has nothing saved yet. */
  load(uid: string): Promise<CloudDocs | null>;
  save(uid: string, ops: SaveOps): Promise<void>;
  /** Web link to where the files live (e.g. the Ascent folder in Drive), once known. */
  folderUrl?(): string | null;
  /** Look up the folder link without creating anything. */
  locateFolder?(): Promise<void>;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'reconnect';

/** Thrown when access to the user's storage has expired and needs a `reconnect()`. */
export class CloudAuthExpiredError extends Error {
  readonly code = 'auth/expired';
  constructor() {
    super('Your Google Drive connection expired.');
  }
}

/** An error with a stable code that the UI can explain. */
export class CloudError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}
