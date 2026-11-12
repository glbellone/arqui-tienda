import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import type { Sequelize } from 'sequelize';
import { SEQUELIZE, crearSequelize } from './sequelize.provider';
import { TenantDb } from './tenant-db';

/**
 * Conexión de la celda. El esquema (tablas, rol app_user y políticas de RLS) lo crea el SQL de
 * app/db/init al levantar la base; Sequelize solo lee y escribe (ADR-013).
 */
@Global()
@Module({
  providers: [{ provide: SEQUELIZE, useFactory: crearSequelize }, TenantDb],
  exports: [SEQUELIZE, TenantDb],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async onModuleDestroy() {
    await this.sequelize.close();
  }
}
