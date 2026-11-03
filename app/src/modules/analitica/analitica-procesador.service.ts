import { Injectable } from '@nestjs/common';
import { TenantDb } from '../../shared/db/tenant-db';

@Injectable()
export class AnaliticaProcesadorService {
  constructor(private readonly tenantDb: TenantDb) {}

  async registrarProductoCreado(tiendaId: string): Promise<void> {
    const query = `
      INSERT INTO analitica_tiendas (tienda_id, total_productos, actualizado_en)
      VALUES ($1, 1, now())
      ON CONFLICT (tienda_id) DO UPDATE SET
        total_productos = analitica_tiendas.total_productos + 1,
        actualizado_en = now();
    `;
    await this.tenantDb.query(query, [tiendaId]);
  }

  async registrarPedidoConfirmado(tiendaId: string, montoCentavos: number): Promise<void> {
    const query = `
      INSERT INTO analitica_tiendas (tienda_id, total_pedidos_confirmados, monto_total_ventas_centavos, actualizado_en)
      VALUES ($1, 1, $2, now())
      ON CONFLICT (tienda_id) DO UPDATE SET
        total_pedidos_confirmados = analitica_tiendas.total_pedidos_confirmados + 1,
        monto_total_ventas_centavos = analitica_tiendas.monto_total_ventas_centavos + EXCLUDED.monto_total_ventas_centavos,
        actualizado_en = now();
    `;
    await this.tenantDb.query(query, [tiendaId, montoCentavos]);
  }

  async obtenerTotales(): Promise<any[]> {
    const query = `
      SELECT 
        tienda_id AS "tiendaId",
        total_productos AS "totalProductos",
        total_pedidos_confirmados AS "totalPedidosConfirmados",
        monto_total_ventas_centavos AS "montoTotalVentasCentavos",
        actualizado_en AS "actualizadoEn"
      FROM analitica_tiendas
      ORDER BY tienda_id ASC;
    `;
    const res = await this.tenantDb.query(query);
    return res.rows;
  }
}