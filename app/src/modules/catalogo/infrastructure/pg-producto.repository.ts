import { Injectable } from '@nestjs/common';
import { DominioError } from '../../../shared/domain/dominio.error';
import { TenantDb } from '../../../shared/db/tenant-db';
import { Precio } from '../domain/precio';
import { Producto } from '../domain/producto';
import type { ProductoRepository } from '../domain/producto.repository';
import { Sku } from '../domain/sku';
import { TiendaId } from '../domain/tienda-id';

interface FilaProducto {
  id: string;
  tienda_id: string;
  sku: string;
  nombre: string;
  precio_centavos: string;
  moneda: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Todas las consultas pasan por TenantDb.conTienda: aunque una consulta no filtre
 * por tienda_id, row-level security devuelve solo las filas de la tienda activa.
 */
@Injectable()
export class PgProductoRepository implements ProductoRepository {
  constructor(private readonly db: TenantDb) {}

  async guardar(p: Producto): Promise<void> {
    try {
      await this.db.conTienda(p.tiendaId.valor, (c) =>
        c.query(
          `INSERT INTO productos (id, tienda_id, sku, nombre, precio_centavos, moneda)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre,
             precio_centavos = EXCLUDED.precio_centavos, moneda = EXCLUDED.moneda`,
          [p.id, p.tiendaId.valor, p.sku.valor, p.nombre, p.precio.centavos, p.precio.moneda],
        ),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new DominioError(`Ya existe un producto con el SKU ${p.sku.valor} en esta tienda`, 'conflicto');
      }
      throw error;
    }
  }

  listarPorTienda(tiendaId: TiendaId): Promise<Producto[]> {
    return this.db.conTienda(tiendaId.valor, async (c) => {
      const { rows } = await c.query<FilaProducto>('SELECT * FROM productos ORDER BY creado_en');
      return rows.map(aProducto);
    });
  }

  async buscarPorId(tiendaId: TiendaId, id: string): Promise<Producto | null> {
    if (!UUID.test(id)) return null;
    return this.db.conTienda(tiendaId.valor, async (c) => {
      const { rows } = await c.query<FilaProducto>('SELECT * FROM productos WHERE id = $1', [id]);
      return rows[0] ? aProducto(rows[0]) : null;
    });
  }
}

function aProducto(fila: FilaProducto): Producto {
  return Producto.reconstruir({
    id: fila.id,
    tiendaId: TiendaId.crear(fila.tienda_id),
    sku: Sku.crear(fila.sku),
    nombre: fila.nombre,
    precio: Precio.desdeCentavos(Number(fila.precio_centavos), fila.moneda),
  });
}
