import { readFileSync } from 'node:fs';

/** Una tienda en el registro: dónde se publica, en qué celda vive y sus datos públicos. */
export interface TiendaRegistrada {
  subdominio: string;
  celda: string;
  nombre: string;
  rubro: string;
  plan: 'Estándar' | 'Premium';
  color: string;
}

/**
 * Registro tienda → subdominio y celda (ADR-004 y ADR-011).
 * Simplificación del TP: es un archivo. En producción lo provee el módulo Tiendas e Inquilinos.
 */
export class Registro {
  private readonly porId: Map<string, TiendaRegistrada>;
  private readonly idPorSubdominio = new Map<string, string>();

  constructor(datos: Record<string, TiendaRegistrada>) {
    this.porId = new Map(Object.entries(datos));
    for (const [id, tienda] of this.porId) this.idPorSubdominio.set(tienda.subdominio.toLowerCase(), id);
  }

  static desdeArchivo(ruta: string): Registro {
    return new Registro(JSON.parse(readFileSync(ruta, 'utf8')));
  }

  buscar(id: string): TiendaRegistrada | undefined {
    return this.porId.get(id);
  }

  idDelSubdominio(subdominio: string): string | undefined {
    return this.idPorSubdominio.get(subdominio.toLowerCase());
  }
}

/** Subdominios de la plataforma que no son tiendas. */
const RESERVADOS = new Set(['www', 'api']);

/**
 * Devuelve el subdominio de tienda del host, o undefined si el pedido llega a un host de la
 * plataforma (localhost, www.localhost, etc.). El puerto se ignora.
 */
export function subdominioDeTienda(host: string | undefined, dominioBase: string): string | undefined {
  if (!host) return undefined;
  const nombre = host.toLowerCase().replace(/:\d+$/, '');
  const sufijo = `.${dominioBase.toLowerCase()}`;
  if (!nombre.endsWith(sufijo)) return undefined;
  const subdominio = nombre.slice(0, -sufijo.length);
  if (!subdominio || subdominio.includes('.') || RESERVADOS.has(subdominio)) return undefined;
  return subdominio;
}
