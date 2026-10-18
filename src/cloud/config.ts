/** The OAuth client id from Google Cloud (see README → Accounts). Null when accounts aren't set up. */
export const googleClientId: string | null = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || null;

/** Dev-only fake accounts, for trying the sign-in flow without Google. */
export const mockCloudEnabled = import.meta.env.DEV && import.meta.env.VITE_CLOUD_MOCK === 'true';

export const cloudConfigured = mockCloudEnabled || googleClientId !== null;
