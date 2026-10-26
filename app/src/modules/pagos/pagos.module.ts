import { Module } from '@nestjs/common';
import { PASARELA_PAGOS } from './domain/pasarela-pagos.port';
import { PasarelaHttpAdapter } from './infrastructure/pasarela-http.adapter';

/** Bounded context Pagos: expone el puerto PasarelaPagos al resto de los módulos (Ventas). */
@Module({
  providers: [{ provide: PASARELA_PAGOS, useClass: PasarelaHttpAdapter }],
  exports: [PASARELA_PAGOS],
})
export class PagosModule {}
