import type { Model, ModelStatic, Transaction } from 'sequelize';
import { esTransaccionDeTienda } from './tenant-db';

const OPERACIONES = [
  'beforeFind',
  'beforeCount',
  'beforeCreate',
  'beforeBulkCreate',
  'beforeUpdate',
  'beforeBulkUpdate',
  'beforeDestroy',
  'beforeBulkDestroy',
  'beforeUpsert',
];

type ModeloConHooks = { addHook(tipo: string, nombre: string, fn: (...args: unknown[]) => void): void };

/**
 * Red de seguridad del ADR-003. Si una consulta se ejecuta sin pasar por TenantDb.conTienda(),
 * saldría por otra conexión del pool sin app.tienda_id y row-level security devolvería cero
 * filas SIN dar error: un bug silencioso. Este guarda lo convierte en un error explícito.
 * Hay que registrarlo en todo modelo que tenga row-level security.
 */
export function exigirTransaccionDeTienda(modelo: ModelStatic<Model>): void {
  for (const operacion of OPERACIONES) {
    (modelo as unknown as ModeloConHooks).addHook(operacion, `tenant-guard:${operacion}`, (...args) => {
      const opciones = args[args.length - 1] as { transaction?: Transaction | null } | undefined;
      if (!esTransaccionDeTienda(opciones?.transaction)) {
        throw new Error(
          `${modelo.name}: la operación ${operacion} se ejecutó fuera de TenantDb.conTienda(); ` +
            'pasá { transaction: tx } en todas las consultas.',
        );
      }
    });
  }
}
