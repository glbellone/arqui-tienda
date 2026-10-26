import { Module } from '@nestjs/common';
import { PagosModule } from '../pagos/pagos.module';

/**
 * Bounded context Ventas: carrito, pedidos y checkout.
 *
 * Pendiente: el checkout usa el puerto PASARELA_PAGOS (inyectado desde PagosModule)
 * para cobrar con Idempotency-Key.
 */
@Module({
  imports: [PagosModule],
})
export class VentasModule {}
