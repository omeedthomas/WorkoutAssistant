/**
 * Google OAuth client ids from apps/mobile/.env.local (see .env.example). EXPO_PUBLIC_ values are built into the
 * app; client ids aren't secret. Read each one as `process.env.EXPO_PUBLIC_…` so Expo can inline it.
 */
export const googleWebClientId: string | null = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || null;
export const googleIosClientId: string | null = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || null;

/** Development only: fake accounts whose "Drive" is stored on the device (EXPO_PUBLIC_CLOUD_MOCK=true). */
export const mockCloudEnabled = __DEV__ && process.env.EXPO_PUBLIC_CLOUD_MOCK === 'true';

export const cloudConfigured = mockCloudEnabled || googleWebClientId !== null;
