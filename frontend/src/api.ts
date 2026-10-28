import { tokenVigente } from './auth';

/** La API se llama en el mismo origen: nginx (o Vite en desarrollo) reenvía /api al gateway. */
const API = import.meta.env.VITE_API_URL ?? '/api';

export interface Producto {
  id: string;
  tiendaId: string;
  sku: string;
  nombre: string;
  precio: { monto: number; moneda: string };
}

export interface NuevoProducto {
  sku: string;
  nombre: string;
  precio: number;
}

/** Datos públicos de una tienda, tal como los devuelve el gateway. */
export interface Tienda {
  id: string;
  nombre: string;
  rubro: string;
  plan: 'Estándar' | 'Premium';
  color: string;
  /** Dirección pública de la tienda: su subdominio. */
  url: string;
}

/** Error de la API en formato Problem Details (RFC 9457). */
export interface Problema {
  title: string;
  status: number;
  detail: string;
}

export class ErrorApi extends Error {
  constructor(readonly problema: Problema) {
    super(problema.detail);
  }
}

/**
 * Llama a la API con el token de la sesión, si hay. Los errores llegan como Problem Details.
 * La celda que atendió cada pedido viaja en el header X-Celda, pero la interfaz no la muestra:
 * es un detalle de la arquitectura. Para la demo se ve en la pestaña Red del navegador.
 */
async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const headers = new Headers(opciones.headers);
  const token = await tokenVigente();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (opciones.body) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${API}${ruta}`, { ...opciones, headers });
  } catch {
    throw new ErrorApi({
      title: 'No pudimos conectarnos',
      status: 0,
      detail: 'Revisá tu conexión y probá de nuevo en unos minutos.',
    });
  }

  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ErrorApi(cuerpo ?? { title: 'Algo salió mal', status: res.status, detail: 'Probá de nuevo en unos minutos.' });
  }
  return cuerpo as T;
}

export function aProblema(error: unknown): Problema {
  if (error instanceof ErrorApi) return error.problema;
  console.error(error);
  return { title: 'Algo salió mal', status: 0, detail: 'Probá de nuevo en unos minutos.' };
}

// En el subdominio de una tienda las rutas no llevan su id: el gateway la resuelve por el host.
// Eso vale también para el panel: el dueño solo puede operar sobre la tienda en la que está.
export const tiendaActual = {
  datos: () => pedir<Tienda>('/v1/tienda'),
  productos: () => pedir<Producto[]>('/v1/productos'),
  producto: (productoId: string) => pedir<Producto>(`/v1/productos/${encodeURIComponent(productoId)}`),
  crearProducto: (producto: NuevoProducto) =>
    pedir<Producto>('/v1/productos', { method: 'POST', body: JSON.stringify(producto) }),
};

// En la plataforma (sin subdominio) se usa el contrato completo de la API (ADR-009).
export const buscarTienda = (tiendaId: string) => pedir<Tienda>(`/v1/tiendas/${tiendaId}`);

/** Los ids de producto son UUID: si la URL trae otra cosa, ni hace falta preguntarle a la API. */
export const esIdDeProducto = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
