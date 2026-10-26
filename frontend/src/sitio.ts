/**
 * Qué sitio está abriendo el navegador, según el host (ADR-011):
 * - {DOMINIO_BASE}            → la plataforma (presentación, sin listado de tiendas)
 * - panel.{DOMINIO_BASE}      → el panel de los dueños
 * - {tienda}.{DOMINIO_BASE}   → la vitrina de esa tienda, y solo de esa
 *
 * El front no sabe qué tienda es cada subdominio: eso lo resuelve el gateway con su registro.
 */
export type Sitio = 'plataforma' | 'panel' | 'tienda';

const DOMINIO_BASE = (import.meta.env.VITE_DOMINIO_BASE ?? 'localhost').toLowerCase();
const RESERVADOS = ['www', 'panel', 'api'];

export function sitioActual(hostname: string = window.location.hostname): Sitio {
  const host = hostname.toLowerCase();
  const sufijo = `.${DOMINIO_BASE}`;
  if (!host.endsWith(sufijo)) return 'plataforma';
  const subdominio = host.slice(0, -sufijo.length);
  if (subdominio === 'panel') return 'panel';
  if (RESERVADOS.includes(subdominio)) return 'plataforma';
  return 'tienda';
}

function url(subdominio?: string): string {
  const { protocol, port } = window.location;
  const host = subdominio ? `${subdominio}.${DOMINIO_BASE}` : DOMINIO_BASE;
  return `${protocol}//${host}${port ? `:${port}` : ''}`;
}

export const urlPanel = () => url('panel');
export const urlPlataforma = () => url();
