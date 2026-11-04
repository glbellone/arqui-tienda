import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { TenantDb } from '../../../shared/db/tenant-db';

export type EstadoPedido = 'PENDIENTE' | 'PAGADO' | 'RECHAZADO';

export interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioCentavos: number;
}

export interface Pedido {
  id: string;
  tiendaId: string;
  claveIdempotencia: string;
  huella: string;
  estado: EstadoPedido;
  totalCentavos: number;
  moneda: string;
  pagoReferencia: string | null;
  creadoEn: Date;
  items?: ItemPedido[];
}

@Injectable()
export class PedidoRepository {
  constructor(private readonly db: TenantDb) {}

  /**

   * Crea el pedido PENDIENTE con precios leídos de la base, o devuelve el existente
   * si la clave de idempotencia ya se usó. `creado` indica si lo creó esta llamada.
   */
  async crearPendienteOExistente(
    tiendaId: string,
    datos: {
      claveIdempotencia: string;
      huella: string;
      items: { productoId: string; cantidad: number }[];
    },
  ): Promise<{ pedido: Pedido; creado: boolean }> {
    return this.db.conTienda(tiendaId, async (c) => {
      const existente = await this.buscarPorClave(c, datos.claveIdempotencia);
      if (existente) return { pedido: existente, creado: false };

      // Consolidar productos repetidos en el carrito
      const cantidades = new Map<string, number>();
      for (const it of datos.items) {
        cantidades.set(it.productoId, (cantidades.get(it.productoId) ?? 0) + it.cantidad);
      }
      const ids = [...cantidades.keys()];

      // La RLS oculta los productos de otras tiendas: si faltan, no son de esta tienda.
      const { rows: productos } = await c.query(
        `SELECT id, nombre, precio_centavos, moneda FROM productos WHERE id = ANY($1::uuid[])`,
        [ids],
      );
      if (productos.length !== ids.length) {
        throw new NotFoundException('Hay productos que no existen en esta tienda');
      }
      const monedas = new Set(productos.map((p) => p.moneda));
      if (monedas.size !== 1) {

        throw new BadRequestException('Todos los productos deben tener la misma moneda');
      }
      const moneda = (productos[0].moneda as string).trim();

      const lineas: ItemPedido[] = productos.map((p) => ({
        productoId: p.id as string,
        nombre: p.nombre as string,
        cantidad: cantidades.get(p.id)!,
        precioCentavos: Number(p.precio_centavos),
      }));
      const totalCentavos = lineas.reduce((s, l) => s + l.precioCentavos * l.cantidad, 0);

      const id = randomUUID();
      const { rows } = await c.query(
        `INSERT INTO pedidos
           (id, tienda_id, clave_idempotencia, huella, estado, total_centavos, moneda)
         VALUES ($1, $2, $3, $4, 'PENDIENTE', $5, $6)
         ON CONFLICT (tienda_id, clave_idempotencia) DO NOTHING
         RETURNING *`,
        [id, tiendaId, datos.claveIdempotencia, datos.huella, totalCentavos, moneda],
      );

      // Carrera: otro request con la misma clave ganó el INSERT
      if (rows.length === 0) {
        const ganador = await this.buscarPorClave(c, datos.claveIdempotencia);
        return { pedido: ganador!, creado: false };
      }

      for (const l of lineas) {
        await c.query(
          `INSERT INTO pedido_items
             (pedido_id, tienda_id, producto_id, nombre, cantidad, precio_centavos)

           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, tiendaId, l.productoId, l.nombre, l.cantidad, l.precioCentavos],
        );
      }

      return { pedido: { ...this.mapear(rows[0]), items: lineas }, creado: true };
    });
  }

  async marcar(
    tiendaId: string,
    pedidoId: string,
    estado: Exclude<EstadoPedido, 'PENDIENTE'>,
    pagoReferencia: string,
  ): Promise<Pedido> {
    return this.db.conTienda(tiendaId, async (c) => {
      const { rows } = await c.query(
        `UPDATE pedidos SET estado = $1, pago_referencia = $2
         WHERE id = $3 RETURNING *`,
        [estado, pagoReferencia, pedidoId],
      );
      if (rows.length === 0) throw new NotFoundException('Pedido no encontrado');
      return this.mapear(rows[0]);
    });
  }

  async listar(tiendaId: string): Promise<Pedido[]> {
    return this.db.conTienda(tiendaId, async (c) => {
      const { rows } = await c.query(
        `SELECT p.*,
                COALESCE(json_agg(json_build_object(
                  'productoId', i.producto_id,

                  'nombre', i.nombre,
                  'cantidad', i.cantidad,
                  'precioCentavos', i.precio_centavos
                )) FILTER (WHERE i.producto_id IS NOT NULL), '[]') AS items
         FROM pedidos p
         LEFT JOIN pedido_items i ON i.pedido_id = p.id
         GROUP BY p.id
         ORDER BY p.creado_en DESC`,
      );
      return rows.map((r) => ({ ...this.mapear(r), items: r.items }));
    });
  }

  private async buscarPorClave(c: PoolClient, clave: string): Promise<Pedido | null> {
    const { rows } = await c.query(
      `SELECT * FROM pedidos WHERE clave_idempotencia = $1`,
      [clave],
    );
    if (rows.length === 0) return null;

    // Las líneas se leen aparte: un reintento devuelve el pedido completo, con sus items.
    const { rows: items } = await c.query(
      `SELECT producto_id, nombre, cantidad, precio_centavos
       FROM pedido_items WHERE pedido_id = $1`,
      [rows[0].id],
    );
    return {
      ...this.mapear(rows[0]),
      items: items.map((i) => ({
        productoId: i.producto_id,
        nombre: i.nombre,
        cantidad: i.cantidad,

        precioCentavos: Number(i.precio_centavos),
      })),
    };
  }

  private mapear(r: any): Pedido {
    return {
      id: r.id,
      tiendaId: r.tienda_id,
      claveIdempotencia: r.clave_idempotencia,
      huella: r.huella,
      estado: r.estado,
      totalCentavos: Number(r.total_centavos),
      moneda: String(r.moneda).trim(),
      pagoReferencia: r.pago_referencia,
      creadoEn: r.creado_en,
    };
  }
}