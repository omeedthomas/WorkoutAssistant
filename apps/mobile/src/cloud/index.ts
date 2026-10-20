import { Platform, TurboModuleRegistry } from 'react-native';
import { CloudError, type CloudBackend } from '@ascent/core/cloud/types';
import { cloudConfigured, googleIosClientId, googleWebClientId, mockCloudEnabled } from './config';

/** Google sign-in is native code: it's in the app's own builds, but not in Expo Go or the browser preview. */
const nativeGoogleSignIn = () => Platform.OS !== 'web' && TurboModuleRegistry.get('RNGoogleSignin') != null;

/** The cloud backend for this build: the dev mock, Google Drive, or none when sync isn't set up. */
export async function getBackend(): Promise<CloudBackend | null> {
  if (!cloudConfigured) return null;
  if (mockCloudEnabled) return (await import('./mock')).createMockBackend();
  // Loading the Google module without its native half would crash, so check first.
  if (!nativeGoogleSignIn()) throw new CloudError('auth/needs-dev-build');
  return (await import('./googleDrive')).createGoogleBackend(googleWebClientId!, googleIosClientId);
}

/** A sentence for the user, or null for things that need no message (like closing the sign-in sheet). */
export function describeCloudError(error: unknown): string | null {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/cancelled':
    case 'auth/in-progress':
      return null;
    case 'auth/expired':
      return 'Google Drive access ran out. Tap Reconnect to save your latest changes.';
    case 'auth/drive-permission':
      return 'Ascent needs permission to save files to your Google Drive. Sign in again and allow Google Drive access.';
    case 'auth/play-services':
      return 'Google sign-in needs Google Play services. Update them from the Play Store and try again.';
    case 'auth/needs-dev-build':
      return "Google Drive sync needs Ascent's own app build. It isn't available in Expo Go or the browser preview.";
    case 'auth/misconfigured':
      return "Google sign-in isn't set up for this build of the app yet: its Android or iOS OAuth client is missing or doesn't match (package name and signing key).";
    case 'drive/api-disabled':
      return "The Google Drive API isn't turned on for this app's Google Cloud project (APIs & Services → Library → Google Drive API → Enable).";
    case 'drive/quota':
      return 'Your Google Drive is full, so new progress can’t be saved there.';
    case 'network':
      return "Couldn't reach Google Drive. Your changes are kept on this phone and upload when you're back online.";
    default:
      return error instanceof Error ? error.message : 'Something went wrong.';
  }
}
