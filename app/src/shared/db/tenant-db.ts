import { Inject, Injectable } from '@nestjs/common';
import type { Sequelize, Transaction } from 'sequelize';
import { SEQUELIZE } from './sequelize.provider';

/** Transacciones abiertas por conTienda(): son las únicas que tienen app.tienda_id fijado. */
const transaccionesDeTienda = new WeakSet<Transaction>();

export const esTransaccionDeTienda = (tx?: Transaction | null): boolean =>
  !!tx && transaccionesDeTienda.has(tx);

@Injectable()
export class TenantDb {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  /**
   * Ejecuta el trabajo dentro de una transacción con la tienda activa fijada.
   * Row-level security usa ese valor para filtrar (ADR-003).
   *
   * La transacción es gestionada: Sequelize hace COMMIT si el trabajo termina bien y
   * ROLLBACK si falla, sin tapar el error original. Toda operación de un modelo tiene
   * que recibir `{ transaction: tx }`; el guarda de tenant-guard.ts lo exige.
   */
  conTienda<T>(tiendaId: string, trabajo: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.sequelize.transaction(async (tx) => {
      await this.sequelize.query("SELECT set_config('app.tienda_id', $1, true)", {
        bind: [tiendaId],
        transaction: tx,
      });
      transaccionesDeTienda.add(tx);
      return trabajo(tx);
    });
  }
}
