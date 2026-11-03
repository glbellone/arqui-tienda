import type { Pool } from 'pg';

/** Un hecho de negocio que publicó alguna celda (ADR-006). */
export type Evento =
  | { eventoId: string; tipo: 'producto.creado'; tiendaId: string; celda: string; ocurridoEn: string }
  | {
      eventoId: string;
      tipo: 'pedido.confirmado';
      tiendaId: string;
      celda: string;
      ocurridoEn: string;
      montoCentavos: number;
    };

export interface TotalTienda {
  tiendaId: string;
  productos: number;
  pedidosConfirmados: number;
  ventasCentavos: number;
  actualizadoEn: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida lo que llega por la cola. Devuelve null si el mensaje no es un evento que entendamos. */
export function leerEvento(cuerpo: unknown): Evento | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const e = cuerpo as Record<string, unknown>;
  if (typeof e.eventoId !== 'string' || !UUID.test(e.eventoId)) return null;
  if (typeof e.tiendaId !== 'string' || !e.tiendaId) return null;
  const base = {
    eventoId: e.eventoId,
    tiendaId: e.tiendaId,
    celda: typeof e.celda === 'string' ? e.celda : 'desconocida',
    ocurridoEn: typeof e.ocurridoEn === 'string' ? e.ocurridoEn : new Date().toISOString(),
  };
  if (e.tipo === 'producto.creado') return { ...base, tipo: 'producto.creado' };
  if (e.tipo === 'pedido.confirmado' && Number.isInteger(e.montoCentavos) && (e.montoCentavos as number) >= 0) {
    return { ...base, tipo: 'pedido.confirmado', montoCentavos: e.montoCentavos as number };
  }
  return null;
}

/** Totales por tienda, en la base propia de Analítica. */
export class Totales {
  constructor(private readonly db: Pool) {}

  /**
   * Suma el evento a los totales de su tienda, en una transacción. Si el evento ya se había
   * procesado (RabbitMQ lo entregó de nuevo), no suma nada y devuelve false.
   */
  async registrar(evento: Evento): Promise<boolean> {
    const cliente = await this.db.connect();
    try {
      await cliente.query('BEGIN');
      const nuevo = await cliente.query(
        'INSERT INTO eventos_procesados (evento_id, tipo) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [evento.eventoId, evento.tipo],
      );
      if (nuevo.rowCount === 0) {
        await cliente.query('ROLLBACK');
        return false;
      }

      if (evento.tipo === 'producto.creado') {
        await cliente.query(
          `INSERT INTO totales_por_tienda (tienda_id, productos) VALUES ($1, 1)
           ON CONFLICT (tienda_id) DO UPDATE SET
             productos = totales_por_tienda.productos + 1,
             actualizado_en = now()`,
          [evento.tiendaId],
        );
      } else {
        await cliente.query(
          `INSERT INTO totales_por_tienda (tienda_id, pedidos_confirmados, ventas_centavos) VALUES ($1, 1, $2)
           ON CONFLICT (tienda_id) DO UPDATE SET
             pedidos_confirmados = totales_por_tienda.pedidos_confirmados + 1,
             ventas_centavos = totales_por_tienda.ventas_centavos + EXCLUDED.ventas_centavos,
             actualizado_en = now()`,
          [evento.tiendaId, evento.montoCentavos],
        );
      }

      await cliente.query('COMMIT');
      return true;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  async listar(): Promise<TotalTienda[]> {
    const { rows } = await this.db.query<{
      tienda_id: string;
      productos: string;
      pedidos_confirmados: string;
      ventas_centavos: string;
      actualizado_en: Date;
    }>('SELECT * FROM totales_por_tienda ORDER BY tienda_id');
    return rows.map((f) => ({
      tiendaId: f.tienda_id,
      productos: Number(f.productos),
      pedidosConfirmados: Number(f.pedidos_confirmados),
      ventasCentavos: Number(f.ventas_centavos),
      actualizadoEn: f.actualizado_en.toISOString(),
    }));
  }
}
