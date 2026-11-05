import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DominioError } from '../../../shared/domain/dominio.error';
import { PASARELA_PAGOS, type PasarelaPagos } from '../../pagos/domain/pasarela-pagos.port';
import { CATALOGO, type Catalogo } from '../domain/catalogo.port';
import { Pedido, type DatosComprador, type DatosEnvio } from '../domain/pedido';
import { PEDIDO_REPOSITORY, type PedidoRepository } from '../domain/pedido.repository';

export interface ConfirmarPedidoComando {
  tiendaId: string;
  /** Identifica el intento de compra: la manda el cliente y se repite en los reintentos. */
  claveIdempotencia: string;
  items: { productoId: string; cantidad: number }[];
  comprador: DatosComprador;
  envio: DatosEnvio;
}

/**
 * Checkout (ADR-007): arma el pedido con los precios de la tienda y lo cobra en la pasarela.
 * Si el cliente reintenta con la misma Idempotency-Key, recibe el mismo pedido y no se cobra dos veces.
 */
@Injectable()
export class ConfirmarPedido {
  constructor(
    @Inject(PEDIDO_REPOSITORY) private readonly pedidos: PedidoRepository,
    @Inject(CATALOGO) private readonly catalogo: Catalogo,
    @Inject(PASARELA_PAGOS) private readonly pagos: PasarelaPagos,
  ) {}

  async ejecutar(comando: ConfirmarPedidoComando): Promise<{ pedido: Pedido; creado: boolean }> {
    const cantidades = consolidar(comando.items);
    // La huella es solo del carrito: corregir un dato de contacto en un reintento no lo vuelve otro pedido.
    const huella = huellaDe(cantidades);

    const existente = await this.pedidos.buscarPorClave(comando.tiendaId, comando.claveIdempotencia);
    const { pedido, creado } = existente
      ? { pedido: existente, creado: false }
      : await this.registrar(comando, cantidades, huella);

    // Misma clave con otro carrito: es un error del cliente, no un reintento.
    if (pedido.huella !== huella) throw new DominioError('La Idempotency-Key ya se usó con un carrito distinto');

    // Ya resuelto (PAGADO o RECHAZADO): se devuelve tal cual, sin cobrar de nuevo.
    if (pedido.estado !== 'PENDIENTE') return { pedido, creado };

    // PENDIENTE: es nuevo, o un intento anterior se cortó antes de guardar el cobro.
    // Cobrar otra vez es seguro: la pasarela no repite un cobro con la misma clave (el id del pedido).
    const cobro = await this.pagos.cobrar({
      referencia: pedido.id,
      montoCentavos: pedido.totalCentavos,
      moneda: pedido.moneda,
      claveIdempotencia: pedido.id,
    });
    pedido.registrarCobro(cobro.estado, cobro.idCobro);
    await this.pedidos.guardarCobro(pedido);
    return { pedido, creado };
  }

  /** Crea el pedido PENDIENTE con los precios que da Catálogo. */
  private async registrar(
    comando: ConfirmarPedidoComando,
    cantidades: Map<string, number>,
    huella: string,
  ): Promise<{ pedido: Pedido; creado: boolean }> {
    const productos = await this.catalogo.productosParaVender(comando.tiendaId, [...cantidades.keys()]);
    const pedido = Pedido.crear({
      tiendaId: comando.tiendaId,
      claveIdempotencia: comando.claveIdempotencia,
      huella,
      items: productos.map((producto) => ({ producto, cantidad: cantidades.get(producto.id) ?? 0 })),
      comprador: comando.comprador,
      envio: comando.envio,
    });
    if (await this.pedidos.agregar(pedido)) return { pedido, creado: true };

    // Otro pedido con la misma clave se guardó primero (dos clics casi juntos): se sigue con ese.
    const ganador = await this.pedidos.buscarPorClave(comando.tiendaId, comando.claveIdempotencia);
    if (!ganador) throw new Error('No se encontró el pedido que ganó la carrera por la misma clave');
    return { pedido: ganador, creado: false };
  }
}

/** Junta las cantidades de un mismo producto que aparece más de una vez en el carrito. */
function consolidar(items: { productoId: string; cantidad: number }[]): Map<string, number> {
  const cantidades = new Map<string, number>();
  for (const { productoId, cantidad } of items) cantidades.set(productoId, (cantidades.get(productoId) ?? 0) + cantidad);
  return cantidades;
}

/** Resumen estable del carrito: el mismo carrito da la misma huella, sin importar el orden de los items. */
function huellaDe(cantidades: Map<string, number>): string {
  const canonico = [...cantidades.entries()].sort(([a], [b]) => a.localeCompare(b));
  return createHash('sha256').update(JSON.stringify(canonico)).digest('hex');
}
