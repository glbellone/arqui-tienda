import { Inject, Injectable } from '@nestjs/common';
import { UniqueConstraintError, type Includeable } from 'sequelize';
import { TenantDb } from '../../../shared/db/tenant-db';
import type { Pedido } from '../domain/pedido';
import type { PedidoRepository } from '../domain/pedido.repository';
import { PedidoMapper } from './pedido.mapper';
import { MODELOS_DE_VENTAS, type ModelosDeVentas } from './pedido.model';

/** Otro pedido con la misma clave de idempotencia se guardó antes (UNIQUE tienda_id + clave_idempotencia). */
class ClaveRepetida extends Error {}

/**
 * Todas las consultas pasan por TenantDb.conTienda y reciben su transacción: row-level security
 * devuelve y acepta solo los pedidos de la tienda activa (ADR-003).
 */
@Injectable()
export class SequelizePedidoRepository implements PedidoRepository {
  constructor(
    private readonly db: TenantDb,
    @Inject(MODELOS_DE_VENTAS) private readonly modelos: ModelosDeVentas,
  ) {}

  /** Las líneas viajan con el pedido en la misma consulta. */
  private get conLineas(): Includeable[] {
    return [{ model: this.modelos.items, as: 'lineas' }];
  }

  buscarPorClave(tiendaId: string, claveIdempotencia: string): Promise<Pedido | null> {
    return this.db.conTienda(tiendaId, async (transaction) => {
      const fila = await this.modelos.pedidos.findOne({ where: { claveIdempotencia }, include: this.conLineas, transaction });
      return fila ? PedidoMapper.aDominio(fila) : null;
    });
  }

  async agregar(p: Pedido): Promise<boolean> {
    try {
      await this.db.conTienda(p.tiendaId, async (transaction) => {
        await this.modelos.pedidos.create(PedidoMapper.aFila(p), { transaction }).catch((error: unknown) => {
          throw error instanceof UniqueConstraintError ? new ClaveRepetida() : error;
        });
        await this.modelos.items.bulkCreate(PedidoMapper.aFilasDeLineas(p), { transaction });
      });
      return true;
    } catch (error) {
      // Dos clics casi juntos: el otro pedido ganó, la transacción se deshizo entera y se avisa con false.
      if (error instanceof ClaveRepetida) return false;
      throw error;
    }
  }

  async guardarCobro(p: Pedido): Promise<void> {
    await this.db.conTienda(p.tiendaId, (transaction) =>
      this.modelos.pedidos.update(
        { estado: p.estado, pagoReferencia: p.pagoReferencia },
        { where: { id: p.id }, transaction },
      ),
    );
  }

  listarPorTienda(tiendaId: string): Promise<Pedido[]> {
    return this.db.conTienda(tiendaId, async (transaction) => {
      const filas = await this.modelos.pedidos.findAll({
        include: this.conLineas,
        order: [['creadoEn', 'DESC']],
        transaction,
      });
      return filas.map(PedidoMapper.aDominio);
    });
  }
}
