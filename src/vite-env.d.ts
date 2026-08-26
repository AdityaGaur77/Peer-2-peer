/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Founder console passcode. Set this in your host's env vars. */
  readonly VITE_ADMIN_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
