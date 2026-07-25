// ── Relay config ─────────────────────────────────────────────
// Everything a founder might want to change lives here.
// Before you publish, work through LAUNCH.md — the founder console
// (/#/admin → Overview) also shows a live launch checklist.

export const FOUNDER_NAME = 'Aditya Gaur';

// Shown on the About page and in the footer. Replace the .demo address
// with a real inbox before you publish — people will write to it.
export const CONTACT_EMAIL = 'hello@relay.demo';

// Passcode for the founder console at /#/admin.
// This is a client-side pilot: it keeps friends out, not attackers.
// Anyone can read it in the JS bundle, so never reuse a real password.
export const ADMIN_CODE = 'passiton';

// Bump to regenerate demo data for everyone (clears local changes).
export const SEED_VERSION = 1;

// ── launch guards ────────────────────────────────────────────
// These power the checklist in the founder console. They're plain
// comparisons so the console can tell you what's still placeholder.

export const DEFAULT_ADMIN_CODE = 'passiton';
export const IS_DEFAULT_ADMIN_CODE = ADMIN_CODE === DEFAULT_ADMIN_CODE;
export const IS_PLACEHOLDER_EMAIL = /\.demo$|example\.(com|org)$/i.test(CONTACT_EMAIL);
