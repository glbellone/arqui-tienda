/**
 * Qué sitio está abriendo el navegador, según el host (ADR-011):
 * - {DOMINIO_BASE}            → la plataforma (presentación, sin listado de tiendas)
 * - {tienda}.{DOMINIO_BASE}   → esa tienda: su vitrina en / y el panel de su dueño en /panel
 *
 * El front no sabe qué tienda es cada subdominio: eso lo resuelve el gateway con su registro.
 */
export type Sitio = 'plataforma' | 'tienda';

const DOMINIO_BASE = (import.meta.env.VITE_DOMINIO_BASE ?? 'localhost').toLowerCase();
const RESERVADOS = ['www', 'api'];

export function sitioActual(hostname: string = window.location.hostname): Sitio {
  const host = hostname.toLowerCase();
  const sufijo = `.${DOMINIO_BASE}`;
  if (!host.endsWith(sufijo)) return 'plataforma';
  return RESERVADOS.includes(host.slice(0, -sufijo.length)) ? 'plataforma' : 'tienda';
}
