// ── Relay config ─────────────────────────────────────────────
// Everything a founder might want to change lives here.
// Before you publish, work through LAUNCH.md — the founder console
// (/#/admin → Overview) also shows a live launch checklist.

export const FOUNDER_NAME = 'Aditya Gaur';

// Shown on the About page and in the footer — people will write here.
export const CONTACT_EMAIL = 'adityagaur12077@gmail.com';

// Passcode for the founder console at /#/admin.
// This is a client-side pilot: it keeps friends out, not attackers.
// It ships inside the JS bundle and lives in the public repo, so treat it
// as a latch, not a lock — never reuse a password from anywhere else.
// (Data is per-browser, so someone unlocking the console elsewhere only
// ever sees their own copy of the board — never yours.)
export const ADMIN_CODE: string = 'G@ur';

// Bump to regenerate demo data for everyone (clears local changes).
export const SEED_VERSION = 1;

// ── launch guards ────────────────────────────────────────────
// These power the checklist in the founder console. They're plain
// comparisons so the console can tell you what's still placeholder. The
// `: string` annotations keep TS from narrowing these to literal types, which
// would make the comparison below a compile error the moment you edit one.

export const DEFAULT_ADMIN_CODE: string = 'passiton';
export const IS_DEFAULT_ADMIN_CODE = ADMIN_CODE === DEFAULT_ADMIN_CODE;
export const IS_PLACEHOLDER_EMAIL = /\.demo$|example\.(com|org)$/i.test(CONTACT_EMAIL);
