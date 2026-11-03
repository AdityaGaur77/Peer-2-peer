// ── Relay config ─────────────────────────────────────────────
// Everything a founder might want to change lives here.

export const FOUNDER_NAME = 'Aditya Gaur';

// Shown on the About page and in the footer.
export const CONTACT_EMAIL = 'adityagaur12077@gmail.com';

// ── founder console passcode ─────────────────────────────────
// Set VITE_ADMIN_CODE in your host's environment variables (on Vercel:
// Project → Settings → Environment Variables, then redeploy). Doing it that
// way keeps the passcode out of this repo entirely.
//
// Either way this is a latch, not a lock: every visitor gets their own copy
// of the board in their browser, so unlocking the console somewhere else
// only ever shows that person their own data, never yours.
const ENV_ADMIN_CODE = (import.meta.env.VITE_ADMIN_CODE ?? '').trim();

// `npm run dev` on your own computer works without the variable, using the
// passcode "dev". A deployed site without VITE_ADMIN_CODE keeps the
// console locked, so forgetting to set it can never leave it open.
export const ADMIN_CODE: string = ENV_ADMIN_CODE || (import.meta.env.DEV ? 'dev' : '');
export const ADMIN_CODE_FROM_ENV = ENV_ADMIN_CODE.length > 0;

// Bump this to push a fresh start to everyone, wiping their saved board.
export const SEED_VERSION = 2;

// ── launch guards ────────────────────────────────────────────
// Powers the checklist in the founder console.

export const IS_PLACEHOLDER_EMAIL = /\.demo$|example\.(com|org)$/i.test(CONTACT_EMAIL);
