import Keycloak from 'keycloak-js';

/** Login OIDC con Keycloak (ADR-005), con Authorization Code + PKCE. */
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  realm: 'tiendas',
  clientId: 'tiendas-web',
});

export type Rol = 'admin' | 'duenio' | 'comprador';

export interface Sesion {
  nombre: string;
  usuario: string;
  roles: Rol[];
  /** Solo para dueños: la tienda que administran. */
  tiendaId?: string;
}

/** Se llama una sola vez, antes de renderizar la app. */
export function iniciarAuth(): Promise<boolean> {
  return keycloak.init({ pkceMethod: 'S256', checkLoginIframe: false });
}

export function sesionActual(): Sesion | null {
  if (!keycloak.authenticated || !keycloak.tokenParsed) return null;
  const claims = keycloak.tokenParsed as {
    given_name?: string;
    preferred_username?: string;
    realm_access?: { roles?: string[] };
    tienda_id?: string;
  };
  const roles = (claims.realm_access?.roles ?? []).filter((r): r is Rol =>
    ['admin', 'duenio', 'comprador'].includes(r),
  );
  return {
    nombre: claims.given_name ?? claims.preferred_username ?? 'Usuario',
    usuario: claims.preferred_username ?? '',
    roles,
    tiendaId: claims.tienda_id,
  };
}

/** Devuelve un token vigente, renovándolo si está por vencer. */
export async function tokenVigente(): Promise<string | undefined> {
  if (!keycloak.authenticated) return undefined;
  try {
    await keycloak.updateToken(30);
  } catch {
    await keycloak.login();
  }
  return keycloak.token;
}

export const ingresar = () => keycloak.login();
export const salir = () => keycloak.logout({ redirectUri: window.location.origin });
