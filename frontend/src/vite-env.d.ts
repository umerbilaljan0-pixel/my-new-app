/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute base URL of the CLEANPLATE engine. Empty = same-origin (web
   *  build behind nginx); the desktop build (`--mode desktop`) sets it to the
   *  local engine. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
