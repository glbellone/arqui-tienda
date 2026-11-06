import { randomBytes } from 'node:crypto';
import { ErrorDeNegocio } from './http';

/**
 * Cliente mínimo de la API de administración de Keycloak (ADR-005). El servicio de Tiendas la usa
 * para dar de alta al dueño de cada tienda nueva y habilitar el login desde su subdominio.
 */
export class Keycloak {
  private readonly url = process.env.KEYCLOAK_URL ?? 'http://keycloak:8080';
  private readonly realm = 'tiendas';
  private readonly clientId = 'tiendas-web';
  private readonly urlPublica = process.env.URL_PUBLICA_TIENDA ?? 'http://{subdominio}.localhost:5173';
  private tokenGuardado?: { valor: string; vence: number };

  /** Crea el usuario dueño de una tienda, con rol duenio y su tienda_id. Devuelve la contraseña inicial. */
  async crearDuenio(datos: { nombre: string; email: string; tiendaId: string }): Promise<{ usuario: string; clave: string }> {
    const clave = randomBytes(9).toString('base64url');
    const res = await this.pedir('POST', '/users', {
      username: datos.email,
      email: datos.email,
      emailVerified: true,
      enabled: true,
      firstName: datos.nombre,
      attributes: { tienda_id: [datos.tiendaId] },
      credentials: [{ type: 'password', value: clave, temporary: false }],
    });
    if (res.status === 409) throw new ErrorDeNegocio(409, `Ya existe un usuario con el email ${datos.email}`);
    await this.exigirOk(res, 'crear el usuario del dueño');

    const id = res.headers.get('location')?.split('/').pop();
    const rol = await this.json<{ id: string; name: string }>('GET', '/roles/duenio');
    await this.exigirOk(await this.pedir('POST', `/users/${id}/role-mappings/realm`, [rol]), 'asignar el rol duenio');
    return { usuario: datos.email, clave };
  }

  /** Borra los usuarios dueños de una tienda (los que tienen su tienda_id). */
  async eliminarDuenios(tiendaId: string): Promise<void> {
    const usuarios = await this.json<{ id: string }[]>('GET', `/users?q=${encodeURIComponent(`tienda_id:${tiendaId}`)}&max=100`);
    for (const u of usuarios) await this.exigirOk(await this.pedir('DELETE', `/users/${u.id}`), 'borrar un usuario');
  }

  /** Habilita el login desde el subdominio de una tienda: Keycloak solo vuelve a direcciones registradas. */
  permitirSitio(subdominio: string): Promise<void> {
    return this.cambiarRedirecciones((uris) => [...new Set([...uris, this.redireccion(subdominio)])]);
  }

  quitarSitio(subdominio: string): Promise<void> {
    return this.cambiarRedirecciones((uris) => uris.filter((u) => u !== this.redireccion(subdominio)));
  }

  private redireccion(subdominio: string) {
    return `${this.urlPublica.replace('{subdominio}', subdominio)}/*`;
  }

  private async cambiarRedirecciones(cambio: (uris: string[]) => string[]): Promise<void> {
    const [cliente] = await this.json<{ id: string; redirectUris?: string[] }[]>('GET', `/clients?clientId=${this.clientId}`);
    if (!cliente) throw new Error(`No existe el cliente ${this.clientId} en Keycloak`);
    const redirectUris = cambio(cliente.redirectUris ?? []);
    await this.exigirOk(await this.pedir('PUT', `/clients/${cliente.id}`, { ...cliente, redirectUris }), 'actualizar el cliente web');
  }

  /** Token de administración de Keycloak; se reutiliza hasta poco antes de que venza. */
  private async token(): Promise<string> {
    if (this.tokenGuardado && this.tokenGuardado.vence > Date.now()) return this.tokenGuardado.valor;
    const res = await fetch(`${this.url}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: process.env.KEYCLOAK_ADMIN_USUARIO ?? 'admin',
        password: process.env.KEYCLOAK_ADMIN_CLAVE ?? 'admin',
      }),
    });
    await this.exigirOk(res, 'obtener el token de administración');
    const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenGuardado = { valor: access_token, vence: Date.now() + (expires_in - 10) * 1000 };
    return access_token;
  }

  private async pedir(metodo: string, ruta: string, cuerpo?: unknown): Promise<Response> {
    return fetch(`${this.url}/admin/realms/${this.realm}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  }

  private async json<T>(metodo: string, ruta: string): Promise<T> {
    const res = await this.pedir(metodo, ruta);
    await this.exigirOk(res, `consultar ${ruta}`);
    return (await res.json()) as T;
  }

  private async exigirOk(res: Response, accion: string): Promise<void> {
    if (res.ok) return;
    console.error(`Keycloak respondió ${res.status} al ${accion}: ${await res.text().catch(() => '')}`);
    throw new ErrorDeNegocio(502, `No se pudo ${accion} en Keycloak`);
  }
}
