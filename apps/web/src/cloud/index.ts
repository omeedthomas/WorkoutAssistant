import { googleClientId } from './config';
import type { CloudBackend } from '@ascent/core/cloud/types';

export { cloudConfigured } from './config';
export type { CloudBackend, CloudUser, SyncStatus } from '@ascent/core/cloud/types';

/** The configured account backend, or null when this build runs local-only. */
export async function getBackend(): Promise<CloudBackend | null> {
  // Spelled out (not via mockCloudEnabled) so production builds drop the mock entirely.
  if (import.meta.env.DEV && import.meta.env.VITE_CLOUD_MOCK === 'true') {
    const { createMockBackend } = await import('./mock');
    return createMockBackend();
  }
  if (!googleClientId) return null;
  const { createDriveBackend } = await import('./drive');
  return createDriveBackend(googleClientId);
}

/** Turns error codes into something a person can act on. Null = nothing to show. */
export function describeCloudError(error: unknown): string | null {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/access_denied':
      return null;
    case 'auth/expired':
      return 'Your Google Drive connection expired. Tap Reconnect to save your latest changes.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/drive-permission':
      return 'Ascent needs permission to save files to your Google Drive. Sign in again and leave the Google Drive box ticked.';
    case 'auth/gis-unavailable':
      return "Couldn't load Google sign-in. Check your connection (or an ad blocker) and try again.";
    case 'drive/api-disabled':
      return "The Google Drive API isn't turned on for this app's Google Cloud project (APIs & Services → Library → Google Drive API → Enable).";
    case 'drive/quota':
      return 'Your Google Drive is full, so new progress can’t be saved there.';
    case 'network':
      return "Couldn't reach Google Drive. Check your connection; changes are kept on this device meanwhile.";
    default:
      return error instanceof Error ? error.message : 'Something went wrong.';
  }
}
