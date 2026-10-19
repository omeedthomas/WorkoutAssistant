/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth 2.0 Web client id from Google Cloud, e.g. 1234-abc.apps.googleusercontent.com */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "true" in development to use fake accounts instead of Google. */
  readonly VITE_CLOUD_MOCK?: string;
  /** Contact address shown on the Privacy Policy and Terms of Service. */
  readonly VITE_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
