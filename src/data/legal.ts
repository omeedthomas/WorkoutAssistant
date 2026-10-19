/** When the Privacy Policy and Terms of Service last changed (shown on both pages). */
export const LEGAL_UPDATED = '2026-10-19';

/** Where people can reach you about either document. Set VITE_CONTACT_EMAIL in .env.local before publishing. */
export const CONTACT_EMAIL: string | null = import.meta.env.VITE_CONTACT_EMAIL?.trim() || null;
