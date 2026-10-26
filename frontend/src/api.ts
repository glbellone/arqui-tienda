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

export interface Respuesta<T> {
  datos: T;
  /** Qué celda atendió el pedido (header X-Celda): pool o una celda Premium. */
  celda: string | null;
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<Respuesta<T>> {
  const headers = new Headers(opciones.headers);
  const token = await tokenVigente();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (opciones.body) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${API}${ruta}`, { ...opciones, headers });
  } catch {
    throw new ErrorApi({
      title: 'Sin conexión',
      status: 0,
      detail: 'No se pudo conectar con la API. Revisá que docker compose esté levantado.',
    });
  }

  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ErrorApi(cuerpo ?? { title: 'Error', status: res.status, detail: `La API respondió ${res.status}.` });
  }
  return { datos: cuerpo as T, celda: res.headers.get('X-Celda') };
}

export function aProblema(error: unknown): Problema {
  if (error instanceof ErrorApi) return error.problema;
  return { title: 'Error inesperado', status: 0, detail: String(error) };
}

// Vitrina: la tienda sale del subdominio, así que las rutas no llevan su id.
export const vitrina = {
  tienda: () => pedir<Tienda>('/v1/tienda'),
  productos: () => pedir<Producto[]>('/v1/productos'),
};

// Panel: el dueño trabaja sobre la tienda de su token, con el contrato completo de la API (ADR-009).
export const panel = {
  tienda: (tiendaId: string) => pedir<Tienda>(`/v1/tiendas/${tiendaId}`),
  productos: (tiendaId: string) => pedir<Producto[]>(`/v1/tiendas/${tiendaId}/productos`),
  crearProducto: (tiendaId: string, producto: NuevoProducto) =>
    pedir<Producto>(`/v1/tiendas/${tiendaId}/productos`, { method: 'POST', body: JSON.stringify(producto) }),
};

const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
export const formatearPrecio = (p: Producto['precio']) =>
  p.moneda === 'ARS' ? formato.format(p.monto) : `${p.moneda} ${p.monto.toLocaleString('es-AR')}`;
