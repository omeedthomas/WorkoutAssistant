/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth 2.0 Web client id from Google Cloud, e.g. 1234-abc.apps.googleusercontent.com */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "true" in development to use fake accounts instead of Google. */
  readonly VITE_CLOUD_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
