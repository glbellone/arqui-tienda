import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, TenantDb } from './tenant-db';

// Cada celda apunta a su propia base con DB_URL: el código no sabe si es pool o Premium.
@Global()
@Module({
  providers: [
    { provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DB_URL }) },
    TenantDb,
  ],
  exports: [TenantDb],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
