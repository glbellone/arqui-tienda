import { Module } from '@nestjs/common';
import type { Sequelize } from 'sequelize';
import { SEQUELIZE } from '../../shared/db/sequelize.provider';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { PagosModule } from '../pagos/pagos.module';
import { ConfirmarPedido } from './application/confirmar-pedido';
import { ListarPedidos } from './application/listar-pedidos';
import { CATALOGO } from './domain/catalogo.port';
import { PEDIDO_REPOSITORY } from './domain/pedido.repository';
import { PedidosController } from './http/pedidos.controller';
import { CatalogoAdapter } from './infrastructure/catalogo.adapter';
import { MODELOS_DE_VENTAS, definirModelosDeVentas } from './infrastructure/pedido.model';
import { SequelizePedidoRepository } from './infrastructure/sequelize-pedido.repository';

/**
 * Bounded context Ventas: pedidos y checkout. Usa a Catálogo para saber los precios y a Pagos para
 * cobrar (con Idempotency-Key, ADR-007), siempre a través de puertos.
 */
@Module({
  imports: [CatalogoModule, PagosModule],
  controllers: [PedidosController],
  providers: [
    ConfirmarPedido,
    ListarPedidos,
    { provide: MODELOS_DE_VENTAS, inject: [SEQUELIZE], useFactory: (s: Sequelize) => definirModelosDeVentas(s) },
    { provide: PEDIDO_REPOSITORY, useClass: SequelizePedidoRepository },
    { provide: CATALOGO, useClass: CatalogoAdapter },
  ],
})
export class VentasModule {}
