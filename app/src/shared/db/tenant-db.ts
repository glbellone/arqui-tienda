import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Injectable()
export class TenantDb {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Ejecuta el trabajo dentro de una transacción con la tienda activa fijada.
   * Row-level security usa ese valor para filtrar (ADR-003).
   */
  async conTienda<T>(tiendaId: string, trabajo: (cliente: PoolClient) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query("SELECT set_config('app.tienda_id', $1, true)", [tiendaId]);
      const resultado = await trabajo(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}
