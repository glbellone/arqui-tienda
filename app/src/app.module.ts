import { Module } from '@nestjs/common';
import { DatabaseModule } from './shared/db/database.module';
import { HealthController } from './shared/http/health.controller';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { TiendasModule } from './modules/tiendas/tiendas.module';
import { VentasModule } from './modules/ventas/ventas.module';

// Un módulo por bounded context (ver docs/adr/ADR-002).
@Module({
  imports: [DatabaseModule, CatalogoModule, TiendasModule, VentasModule, PagosModule],
  controllers: [HealthController],
})
export class AppModule {}
