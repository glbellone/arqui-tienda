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

/**
 * La sesión se guarda en sessionStorage para que sobreviva a un F5. Es por origen:
 * cada tienda (cada subdominio) tiene la suya. Si el usuario ya ingresó en otra tienda,
 * Keycloak lo reconoce por su cookie y no le vuelve a pedir la contraseña.
 */
const CLAVE = 'vidriera.sesion';

function guardar() {
  try {
    sessionStorage.setItem(
      CLAVE,
      JSON.stringify({ token: keycloak.token, refreshToken: keycloak.refreshToken, idToken: keycloak.idToken }),
    );
  } catch {
    // Sin sessionStorage la sesión dura hasta recargar la página.
  }
}

function olvidar() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}

function sesionGuardada(): { token: string; refreshToken: string; idToken?: string } | undefined {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Se llama una sola vez, antes de renderizar. Para un visitante anónimo no hace ningún pedido
 * a Keycloak: la vitrina no depende de que Keycloak esté disponible.
 */
export async function iniciarAuth(): Promise<boolean> {
  keycloak.onAuthSuccess = guardar;
  keycloak.onAuthRefreshSuccess = guardar;
  try {
    const autenticado = await keycloak.init({ pkceMethod: 'S256', checkLoginIframe: false, ...sesionGuardada() });
    if (!autenticado) olvidar();
    return autenticado;
  } catch (error) {
    // Sesión guardada vencida o Keycloak caído: se sigue sin sesión.
    olvidar();
    keycloak.clearToken();
    throw error;
  }
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

/** ¿La sesión es del dueño de esta tienda? Solo a él se le muestra el panel. */
export const esDuenioDe = (sesion: Sesion | null, tiendaId: string) =>
  !!sesion && sesion.roles.includes('duenio') && sesion.tiendaId === tiendaId;

/** Devuelve un token vigente, renovándolo si está por vencer. */
export async function tokenVigente(): Promise<string | undefined> {
  if (!keycloak.authenticated) return undefined;
  try {
    await keycloak.updateToken(30);
  } catch {
    olvidar();
    await keycloak.login();
  }
  return keycloak.token;
}

export const ingresar = () => keycloak.login();

export function salir() {
  olvidar();
  return keycloak.logout({ redirectUri: window.location.origin });
}
