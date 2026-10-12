/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" in the single-file standalone build (`npm run build:standalone`). */
  readonly VITE_STANDALONE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
