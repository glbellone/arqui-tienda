import type { Pedido } from './pedido';

export const PEDIDO_REPOSITORY = Symbol('PEDIDO_REPOSITORY');

/** Puerto del dominio: dónde se guardan los pedidos lo decide la implementación. */
export interface PedidoRepository {
  buscarPorClave(tiendaId: string, claveIdempotencia: string): Promise<Pedido | null>;
  /**
   * Guarda un pedido nuevo. Devuelve false si ya había otro con la misma clave de idempotencia
   * (por ejemplo, dos clics casi al mismo tiempo): en ese caso no guarda nada.
   */
  agregar(pedido: Pedido): Promise<boolean>;
  /** Guarda el resultado del cobro. */
  guardarCobro(pedido: Pedido): Promise<void>;
  listarPorTienda(tiendaId: string): Promise<Pedido[]>;
}
