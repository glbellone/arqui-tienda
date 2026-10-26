/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_DOMINIO_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
