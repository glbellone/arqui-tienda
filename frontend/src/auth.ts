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
 * La sesión se guarda en localStorage: sobrevive a un F5 y la comparten todas las pestañas del mismo
 * sitio. Es por origen: cada tienda (cada subdominio) tiene la suya. Si el usuario ya ingresó en otro
 * sitio, Keycloak lo reconoce por su cookie y no le vuelve a pedir la contraseña.
 */
const CLAVE = 'tiendas.sesion';

/** Marca, por pestaña, que ya se intentó recuperar la sesión de Keycloak sin pedir la contraseña. */
const INTENTO_SILENCIOSO = 'tiendas.ingreso-silencioso';

/** Cuánto se espera a Keycloak antes de mostrar la página sin sesión. */
export const ESPERA_KEYCLOAK_MS = 8000;

function guardar() {
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({ token: keycloak.token, refreshToken: keycloak.refreshToken, idToken: keycloak.idToken }),
    );
  } catch {
    // Sin localStorage la sesión dura hasta recargar la página.
  }
}

function olvidar() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}

function sesionGuardada(): { token: string; refreshToken: string; idToken?: string } | undefined {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Se llama una sola vez, antes de dibujar. Para un visitante anónimo no hace ningún pedido a Keycloak:
 * la vitrina no depende de que Keycloak esté disponible.
 *
 * Termina cuando Keycloak responde o, si tarda más de ESPERA_KEYCLOAK_MS, antes: la página se muestra
 * sin sesión y, si Keycloak responde después con el usuario, se avisa con `alIngresarTarde` para
 * volver a dibujarla.
 */
export async function iniciarAuth(alIngresarTarde: () => void): Promise<void> {
  keycloak.onAuthSuccess = guardar;
  keycloak.onAuthRefreshSuccess = guardar;

  let tarde = false;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<void>((listo) => {
    reloj = setTimeout(() => {
      tarde = true;
      // Mientras tanto se navega sin token: los pedidos a la API no se quedan esperando a Keycloak.
      keycloak.clearToken();
      listo();
    }, ESPERA_KEYCLOAK_MS);
  });

  const inicio = keycloak
    .init({ pkceMethod: 'S256', checkLoginIframe: false, ...sesionGuardada() })
    .then((autenticado) => {
      if (!autenticado) olvidar();
      else if (tarde) alIngresarTarde();
    })
    .catch((error) => {
      // Sesión guardada vencida o Keycloak caído: se sigue sin sesión.
      console.error('No se pudo recuperar la sesión', error);
      olvidar();
      keycloak.clearToken();
    })
    .finally(() => clearTimeout(reloj));

  await Promise.race([inicio, limite]);
}

/**
 * Si en otra pestaña del mismo sitio el usuario ingresa o sale, esta pestaña se recarga para mostrar
 * lo mismo. Las renovaciones del token no cuentan: solo pasar de "sin sesión" a "con sesión" o al revés.
 */
export function escucharOtrasPestanas() {
  window.addEventListener('storage', (evento) => {
    if (evento.key === CLAVE && (evento.oldValue === null) !== (evento.newValue === null)) window.location.reload();
  });
}

/**
 * Si el usuario ya ingresó en otro sitio (por ejemplo, en la portada de la plataforma), Keycloak lo
 * reconoce por su cookie: se lo lleva y se lo trae de vuelta ya ingresado, sin pedirle la contraseña.
 * Se intenta una sola vez por pestaña; si no tenía sesión, vuelve igual que antes y no se repite.
 * Devuelve true si salió a intentarlo.
 */
export function intentarIngresoSilencioso(volverA: string): boolean {
  try {
    if (sessionStorage.getItem(INTENTO_SILENCIOSO)) return false;
    sessionStorage.setItem(INTENTO_SILENCIOSO, '1');
  } catch {
    return false;
  }
  void keycloak.login({ prompt: 'none', redirectUri: new URL(volverA, window.location.origin).href });
  return true;
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

/** Lleva al login de Keycloak. Al volver, el usuario queda en la misma página (o en la indicada). */
export const ingresar = (volverA?: string) =>
  keycloak.login(volverA ? { redirectUri: new URL(volverA, window.location.origin).href } : undefined);

export function salir(volverA = '/') {
  olvidar();
  return keycloak.logout({ redirectUri: new URL(volverA, window.location.origin).href });
}
