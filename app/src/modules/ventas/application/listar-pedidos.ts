import { Inject, Injectable } from '@nestjs/common';
import type { Pedido } from '../domain/pedido';
import { PEDIDO_REPOSITORY, type PedidoRepository } from '../domain/pedido.repository';

/** Los pedidos de una tienda, del más reciente al más antiguo. */
@Injectable()
export class ListarPedidos {
  constructor(@Inject(PEDIDO_REPOSITORY) private readonly pedidos: PedidoRepository) {}

  ejecutar(consulta: { tiendaId: string }): Promise<Pedido[]> {
    return this.pedidos.listarPorTienda(consulta.tiendaId);
  }
}
