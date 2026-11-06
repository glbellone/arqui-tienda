import { Client } from 'pg';

/** Las tablas con datos de una tienda, en orden: cada una puede depender de las anteriores. */
export const TABLAS_DE_TIENDA = ['productos', 'pedidos', 'pedido_items'] as const;

/**
 * Abre una conexión a la base de una celda con el usuario `migrador` y la tienda activa fijada.
 * Ese usuario también pasa por row-level security (ADR-003): solo ve y toca las filas de esa tienda.
 */
export async function conTiendaEnCelda<T>(hostDb: string, tiendaId: string, trabajo: (c: Client) => Promise<T>): Promise<T> {
  const cliente = new Client({
    host: hostDb,
    port: 5432,
    database: 'tiendas',
    user: process.env.MIGRADOR_USUARIO ?? 'migrador',
    password: process.env.MIGRADOR_CLAVE ?? 'migrador_pass',
  });
  await cliente.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query("SELECT set_config('app.tienda_id', $1, true)", [tiendaId]);
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await cliente.end();
  }
}

/** Borra todos los datos de una tienda en una celda. */
export function borrarDatosDeTienda(hostDb: string, tiendaId: string): Promise<void> {
  return conTiendaEnCelda(hostDb, tiendaId, async (c) => {
    for (const tabla of [...TABLAS_DE_TIENDA].reverse()) await c.query(`DELETE FROM ${tabla}`);
  });
}
