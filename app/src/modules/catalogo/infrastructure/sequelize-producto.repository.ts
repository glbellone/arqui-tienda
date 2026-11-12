import { Inject, Injectable } from '@nestjs/common';
import { UniqueConstraintError } from 'sequelize';
import { DominioError } from '../../../shared/domain/dominio.error';
import { TenantDb } from '../../../shared/db/tenant-db';
import type { Producto } from '../domain/producto';
import type { ProductoRepository } from '../domain/producto.repository';
import type { TiendaId } from '../domain/tienda-id';
import { ProductoMapper } from './producto.mapper';
import { PRODUCTO_MODEL, type ProductoModel } from './producto.model';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Todas las consultas pasan por TenantDb.conTienda y reciben su transacción: aunque una
 * consulta no filtre por tienda_id, row-level security devuelve solo las filas de la tienda activa.
 */
@Injectable()
export class SequelizeProductoRepository implements ProductoRepository {
  constructor(
    private readonly db: TenantDb,
    @Inject(PRODUCTO_MODEL) private readonly productos: typeof ProductoModel,
  ) {}

  async guardar(p: Producto): Promise<void> {
    const fila = ProductoMapper.aFila(p);
    try {
      await this.db.conTienda(p.tiendaId.valor, async (transaction) => {
        const existente = await this.productos.findByPk(p.id, { transaction });
        if (existente) {
          await existente.update(
            { nombre: fila.nombre, precioCentavos: fila.precioCentavos, moneda: fila.moneda },
            { transaction },
          );
        } else {
          await this.productos.create(fila, { transaction });
        }
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new DominioError(`Ya existe un producto con el SKU ${p.sku.valor} en esta tienda`, 'conflicto');
      }
      throw error;
    }
  }

  listarPorTienda(tiendaId: TiendaId): Promise<Producto[]> {
    return this.db.conTienda(tiendaId.valor, async (transaction) => {
      const filas = await this.productos.findAll({ order: [['creadoEn', 'ASC']], transaction });
      return filas.map(ProductoMapper.aDominio);
    });
  }

  async buscarPorId(tiendaId: TiendaId, id: string): Promise<Producto | null> {
    if (!UUID.test(id)) return null;
    return this.db.conTienda(tiendaId.valor, async (transaction) => {
      const fila = await this.productos.findByPk(id, { transaction });
      return fila ? ProductoMapper.aDominio(fila) : null;
    });
  }
}
