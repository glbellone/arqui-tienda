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
  /** El plan de la tienda y la última solicitud de pase a Premium. Solo para su dueño. */
  plan: () => pedir<PlanTienda>('/v1/plan'),
  pedirPremium: () => pedir<SolicitudPremium>('/v1/plan/solicitud', { method: 'POST' }),
};

export type EstadoSolicitud = 'pendiente' | 'en-curso' | 'completada' | 'fallida' | 'rechazada';

/** Una solicitud de pase a Premium, tal como la ve el dueño: solo su estado. */
export interface SolicitudPremium {
  id: string;
  estado: EstadoSolicitud;
  creadaEn: string;
  actualizadaEn: string;
}

export interface PlanTienda {
  plan: 'Estándar' | 'Premium';
  solicitud: SolicitudPremium | null;
}

// En la plataforma (sin subdominio) se usa el contrato completo de la API (ADR-009).
export const buscarTienda = (tiendaId: string) => pedir<Tienda>(`/v1/tiendas/${tiendaId}`);

/** Los ids de producto son UUID: si la URL trae otra cosa, ni hace falta preguntarle a la API. */
export const esIdDeProducto = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Totales de una tienda según el servicio de Analítica (ADR-006). */
export interface EstadisticaTienda {
  tiendaId: string;
  productos: number;
  pedidosConfirmados: number;
  ventasCentavos: number;
  actualizadoEn: string;
}

/** Una tienda tal como la ve el administrador de la plataforma (ADR-012). */
export interface TiendaAdmin {
  id: string;
  subdominio: string;
  nombre: string;
  rubro: string;
  color: string;
  plan: 'Estándar' | 'Premium';
  /** En qué celda vive: pool o una celda Premium. */
  celda: string;
  /** mudandose: se está pasando a otra celda. */
  estado: 'activa' | 'mudandose';
  creadaEn: string;
  url: string;
}

export interface NuevaTienda {
  nombre: string;
  subdominio: string;
  rubro: string;
  color: string;
  duenio: { nombre: string; email: string };
}

/** La tienda creada y el usuario de su dueño. La contraseña se muestra una sola vez. */
export interface TiendaCreada {
  tienda: TiendaAdmin;
  duenio: { usuario: string; clave: string };
}

/** Pasos de la mudanza a Premium, en orden (ADR-012). */
export type PasoMudanza =
  | 'creando-celda'
  | 'frenando-escrituras'
  | 'copiando-datos'
  | 'verificando'
  | 'cambiando-ruteo'
  | 'limpiando-pool';

/** Una solicitud de pase a Premium, tal como la ve el administrador: con el paso de la mudanza. */
export interface SolicitudAdmin {
  id: string;
  tiendaId: string;
  estado: EstadoSolicitud;
  paso: PasoMudanza | null;
  celdaDestino: string | null;
  error: string | null;
  creadaEn: string;
  actualizadaEn: string;
  /** Falta si la tienda se dio de baja. */
  tienda?: { nombre: string; subdominio: string; plan: 'Estándar' | 'Premium'; celda: string; color: string };
}

/** Administración de la plataforma: solo para el rol admin. */
export const admin = {
  estadisticas: () => pedir<EstadisticaTienda[]>('/v1/admin/estadisticas'),
  tiendas: () => pedir<TiendaAdmin[]>('/v1/admin/tiendas'),
  crearTienda: (datos: NuevaTienda) =>
    pedir<TiendaCreada>('/v1/admin/tiendas', { method: 'POST', body: JSON.stringify(datos) }),
  darDeBaja: (id: string) => pedir<null>(`/v1/admin/tiendas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  solicitudes: () => pedir<SolicitudAdmin[]>('/v1/admin/solicitudes'),
  aprobar: (id: string) =>
    pedir<SolicitudAdmin>(`/v1/admin/solicitudes/${encodeURIComponent(id)}/aprobar`, { method: 'POST' }),
  rechazar: (id: string) =>
    pedir<SolicitudAdmin>(`/v1/admin/solicitudes/${encodeURIComponent(id)}/rechazar`, { method: 'POST' }),
};
