import { Module } from '@nestjs/common';
import { PagosModule } from '../pagos/pagos.module';
import { PedidosController } from './http/pedidos.controller';
import { ConfirmarPedido } from './application/confirmar-pedido.usecase';
import { PedidoRepository } from './infrastructure/pedido.repository';

/**
 * Bounded context Ventas: carrito, pedidos y checkout.
 * El checkout cobra a través del puerto PASARELA_PAGOS (exportado por PagosModule)
 * usando Idempotency-Key.
 */
@Module({
  imports: [PagosModule],
  controllers: [PedidosController],
  providers: [ConfirmarPedido, PedidoRepository],
})
export class VentasModule {}