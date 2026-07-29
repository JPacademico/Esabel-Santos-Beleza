/**
 * The salon's public-facing name — what clients read in WhatsApp messages and
 * what shows in the app header.
 *
 * Kept in one place because it appears in several outgoing message templates;
 * a rename that misses one of them looks unprofessional to the client, which is
 * exactly the problem this constant exists to prevent.
 *
 * Not reachable from `index.html`, `vite.config.ts` or `sw.ts` (they run
 * outside the module graph), so those three carry the literal string.
 */
export const BRAND_NAME = "Studio Esabel Santos";

/** Bolded for WhatsApp message bodies. */
export const BRAND_WA = `*${BRAND_NAME}*`;
