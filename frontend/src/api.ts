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

export type EstadoPedido = 'PENDIENTE' | 'PAGADO' | 'RECHAZADO';

export interface ItemPedidoNuevo {
  productoId: string;
  cantidad: number;
}

export interface DatosComprador {
  nombre: string;
  email: string;
  telefono?: string;
}

export interface DatosEnvio {
  direccion: string;
  ciudad: string;
  codigoPostal: string;
}

/** Lo que manda el checkout. Los precios no viajan: los pone la tienda. */
export interface NuevoPedido {
  items: ItemPedidoNuevo[];
  comprador: DatosComprador;
  envio: DatosEnvio;
}

export interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: { monto: number; moneda: string };
}

export interface Pedido {
  id: string;
  estado: EstadoPedido;
  total: { monto: number; moneda: string };
  comprador: DatosComprador;
  envio: DatosEnvio;
  creadoEn: string;
  items: ItemPedido[];
}

/** Como lo devuelve el backend: importes en centavos. */
interface PedidoCrudo {
  id: string;
  estado: EstadoPedido;
  totalCentavos: number;
  moneda: string;
  comprador: DatosComprador;
  envio: DatosEnvio;
  creadoEn: string;
  items?: { productoId: string; nombre: string; cantidad: number; precioCentavos: number }[];
}

// El backend guarda los importes en centavos; en el front se usan en pesos, como `precio.monto` de los productos.
const aMonto = (centavos: number) => centavos / 100;

function aPedido(p: PedidoCrudo): Pedido {
  return {
    id: p.id,
    estado: p.estado,
    total: { monto: aMonto(p.totalCentavos), moneda: p.moneda },
    comprador: p.comprador,
    envio: p.envio,
    creadoEn: p.creadoEn,
    items: (p.items ?? []).map((i) => ({
      productoId: i.productoId,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio: { monto: aMonto(i.precioCentavos), moneda: p.moneda },
    })),
  };
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
  confirmarPedido: async (claveIdempotencia: string, pedido: NuevoPedido) =>
    aPedido(
      await pedir<PedidoCrudo>('/v1/pedidos', {
        method: 'POST',
        body: JSON.stringify(pedido),
        headers: { 'Idempotency-Key': claveIdempotencia },
      }),
    ),
  pedidos: async () => (await pedir<PedidoCrudo[]>('/v1/pedidos')).map(aPedido),
};

// En la plataforma (sin subdominio) se usa el contrato completo de la API (ADR-009).
export const buscarTienda = (tiendaId: string) => pedir<Tienda>(`/v1/tiendas/${tiendaId}`);

/** Los ids de producto son UUID: si la URL trae otra cosa, ni hace falta preguntarle a la API. */
export const esIdDeProducto = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
