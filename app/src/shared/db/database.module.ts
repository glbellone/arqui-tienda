import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import type { Sequelize } from 'sequelize';
import { EsquemaInicializador } from './esquema-inicializador';
import { ModelosPorTienda } from './modelos-por-tienda';
import { SEQUELIZE, crearSequelize } from './sequelize.provider';
import { TenantDb } from './tenant-db';

@Global()
@Module({
  providers: [{ provide: SEQUELIZE, useFactory: crearSequelize }, TenantDb, ModelosPorTienda, EsquemaInicializador],
  exports: [SEQUELIZE, TenantDb, ModelosPorTienda],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async onModuleDestroy() {
    await this.sequelize.close();
  }
}
