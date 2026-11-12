import { Module } from '@nestjs/common';
import { DatabaseModule } from './shared/db/database.module';
import { EventosModule } from './shared/infrastructure/eventos/eventos.module';
import { HealthController } from './shared/http/health.controller';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { VentasModule } from './modules/ventas/ventas.module';

// Un módulo por bounded context (ADR-002 del documento de arquitectura).
@Module({
  imports: [DatabaseModule, EventosModule, CatalogoModule, VentasModule, PagosModule],
  controllers: [HealthController],
})
export class AppModule {}
