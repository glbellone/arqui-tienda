import { Inject, Injectable } from '@nestjs/common';
import type { Solicitante } from '../../../shared/application/solicitante';
import { DominioError } from '../../../shared/domain/dominio.error';
import type { Pedido } from '../domain/pedido';
import { PEDIDO_REPOSITORY, type PedidoRepository } from '../domain/pedido.repository';

export interface ListarPedidosConsulta {
  /** Quién pide los pedidos: tiene que ser el dueño de la tienda. */
  solicitante: Solicitante;
  tiendaId: string;
}

/** El dueño ve los pedidos de su tienda, del más reciente al más antiguo. Incluyen datos personales de los compradores. */
@Injectable()
export class ListarPedidos {
  constructor(@Inject(PEDIDO_REPOSITORY) private readonly pedidos: PedidoRepository) {}

  async ejecutar(consulta: ListarPedidosConsulta): Promise<Pedido[]> {
    // Misma regla de aislamiento que al cargar productos: que sea dueño (el rol) lo controla el AuthGuard;
    // acá se controla que sea el dueño de ESTA tienda.
    if (consulta.solicitante.tiendaId !== consulta.tiendaId) {
      throw new DominioError('Solo podés ver los pedidos de tu propia tienda', 'prohibido');
    }
    return this.pedidos.listarPorTienda(consulta.tiendaId);
  }
}
