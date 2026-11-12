import { randomUUID } from 'node:crypto';
import { DominioError } from '../../../shared/domain/dominio.error';
import type { ProductoEnVenta } from './catalogo.port';

export type EstadoPedido = 'PENDIENTE' | 'PAGADO' | 'RECHAZADO';

/** Un producto tal como se vendió: el nombre y el precio quedan fijos aunque después cambien en el catálogo. */
export interface LineaPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioCentavos: number;
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

export interface DatosPedido {
  id: string;
  tiendaId: string;
  claveIdempotencia: string;
  huella: string;
  lineas: LineaPedido[];
  moneda: string;
  comprador: DatosComprador;
  envio: DatosEnvio;
  creadoEn: Date;
  estado: EstadoPedido;
  pagoReferencia: string | null;
}

/**
 * Agregado raíz de Ventas: un intento de compra en una tienda y el resultado de su cobro.
 * El total sale de los precios de la tienda; el cliente solo elige productos y cantidades.
 */
export class Pedido {
  readonly id: string;
  readonly tiendaId: string;
  readonly claveIdempotencia: string;
  readonly huella: string;
  readonly lineas: readonly LineaPedido[];
  readonly moneda: string;
  readonly comprador: DatosComprador;
  readonly envio: DatosEnvio;
  readonly creadoEn: Date;
  private _estado: EstadoPedido;
  private _pagoReferencia: string | null;

  private constructor(datos: DatosPedido) {
    this.id = datos.id;
    this.tiendaId = datos.tiendaId;
    this.claveIdempotencia = datos.claveIdempotencia;
    this.huella = datos.huella;
    this.lineas = datos.lineas;
    this.moneda = datos.moneda;
    this.comprador = datos.comprador;
    this.envio = datos.envio;
    this.creadoEn = datos.creadoEn;
    this._estado = datos.estado;
    this._pagoReferencia = datos.pagoReferencia;
  }

  static crear(nuevo: {
    tiendaId: string;
    claveIdempotencia: string;
    /** Resumen del carrito: la misma clave con otra huella es otro carrito (ADR-007). */
    huella: string;
    items: { producto: ProductoEnVenta; cantidad: number }[];
    comprador: DatosComprador;
    envio: DatosEnvio;
  }): Pedido {
    if (nuevo.items.length === 0) throw new DominioError('El pedido necesita al menos un producto');
    for (const { cantidad } of nuevo.items) {
      if (!Number.isInteger(cantidad) || cantidad < 1) throw new DominioError('La cantidad tiene que ser al menos 1');
    }
    const monedas = new Set(nuevo.items.map(({ producto }) => producto.moneda));
    if (monedas.size > 1) throw new DominioError('Todos los productos del pedido tienen que tener la misma moneda');

    return new Pedido({
      id: randomUUID(),
      tiendaId: nuevo.tiendaId,
      claveIdempotencia: nuevo.claveIdempotencia,
      huella: nuevo.huella,
      lineas: nuevo.items.map(({ producto, cantidad }) => ({
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad,
        precioCentavos: producto.precioCentavos,
      })),
      moneda: [...monedas][0],
      comprador: nuevo.comprador,
      envio: nuevo.envio,
      creadoEn: new Date(),
      estado: 'PENDIENTE',
      pagoReferencia: null,
    });
  }

  /** Para reconstruir desde la base, sin volver a generar identidad. */
  static reconstruir(datos: DatosPedido): Pedido {
    return new Pedido(datos);
  }

  get estado(): EstadoPedido {
    return this._estado;
  }

  get pagoReferencia(): string | null {
    return this._pagoReferencia;
  }

  get totalCentavos(): number {
    return this.lineas.reduce((total, l) => total + l.precioCentavos * l.cantidad, 0);
  }

  /** Anota el resultado del cobro. Un pedido se cobra una sola vez: después ya no cambia. */
  registrarCobro(resultado: 'aprobado' | 'rechazado', pagoReferencia: string): void {
    if (this._estado !== 'PENDIENTE') throw new DominioError('El pago de este pedido ya está resuelto', 'conflicto');
    this._estado = resultado === 'aprobado' ? 'PAGADO' : 'RECHAZADO';
    this._pagoReferencia = pagoReferencia;
  }
}
