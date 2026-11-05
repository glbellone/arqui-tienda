import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { TenantDb } from '../../../shared/db/tenant-db';
import { Pedido, type EstadoPedido, type LineaPedido } from '../domain/pedido';
import type { PedidoRepository } from '../domain/pedido.repository';

interface FilaPedido {
  id: string;
  tienda_id: string;
  clave_idempotencia: string;
  huella: string;
  estado: EstadoPedido;
  moneda: string;
  pago_referencia: string | null;
  comprador_nombre: string;
  comprador_email: string;
  comprador_telefono: string | null;
  envio_direccion: string;
  envio_ciudad: string;
  envio_codigo_postal: string;
  creado_en: Date;
}

interface FilaLinea {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_centavos: string;
}

/**
 * Todas las consultas pasan por TenantDb.conTienda: row-level security devuelve y acepta
 * solo los pedidos de la tienda activa (ADR-003).
 */
@Injectable()
export class PgPedidoRepository implements PedidoRepository {
  constructor(private readonly db: TenantDb) {}

  buscarPorClave(tiendaId: string, claveIdempotencia: string): Promise<Pedido | null> {
    return this.db.conTienda(tiendaId, async (c) => {
      const { rows } = await c.query<FilaPedido>('SELECT * FROM pedidos WHERE clave_idempotencia = $1', [claveIdempotencia]);
      if (rows.length === 0) return null;
      return aPedido(rows[0], await lineasDe(c, rows[0].id));
    });
  }

  agregar(p: Pedido): Promise<boolean> {
    return this.db.conTienda(p.tiendaId, async (c) => {
      // Si otro pedido con la misma clave se guardó antes, el INSERT no hace nada y se avisa con false.
      const { rowCount } = await c.query(
        `INSERT INTO pedidos
           (id, tienda_id, clave_idempotencia, huella, estado, total_centavos, moneda,
            comprador_nombre, comprador_email, comprador_telefono,
            envio_direccion, envio_ciudad, envio_codigo_postal, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (tienda_id, clave_idempotencia) DO NOTHING`,
        [
          p.id,
          p.tiendaId,
          p.claveIdempotencia,
          p.huella,
          p.estado,
          p.totalCentavos,
          p.moneda,
          p.comprador.nombre,
          p.comprador.email,
          p.comprador.telefono ?? null,
          p.envio.direccion,
          p.envio.ciudad,
          p.envio.codigoPostal,
          p.creadoEn,
        ],
      );
      if (rowCount === 0) return false;

      for (const l of p.lineas) {
        await c.query(
          `INSERT INTO pedido_items (pedido_id, tienda_id, producto_id, nombre, cantidad, precio_centavos)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [p.id, p.tiendaId, l.productoId, l.nombre, l.cantidad, l.precioCentavos],
        );
      }
      return true;
    });
  }

  async guardarCobro(p: Pedido): Promise<void> {
    await this.db.conTienda(p.tiendaId, (c) =>
      c.query('UPDATE pedidos SET estado = $1, pago_referencia = $2 WHERE id = $3', [p.estado, p.pagoReferencia, p.id]),
    );
  }

  listarPorTienda(tiendaId: string): Promise<Pedido[]> {
    return this.db.conTienda(tiendaId, async (c) => {
      const { rows } = await c.query<FilaPedido & { lineas: FilaLinea[] }>(
        `SELECT p.*,
                COALESCE(json_agg(json_build_object(
                  'producto_id', i.producto_id,
                  'nombre', i.nombre,
                  'cantidad', i.cantidad,
                  'precio_centavos', i.precio_centavos
                )) FILTER (WHERE i.producto_id IS NOT NULL), '[]') AS lineas
         FROM pedidos p
         LEFT JOIN pedido_items i ON i.pedido_id = p.id
         GROUP BY p.id
         ORDER BY p.creado_en DESC`,
      );
      return rows.map((fila) => aPedido(fila, fila.lineas));
    });
  }
}

async function lineasDe(c: PoolClient, pedidoId: string): Promise<FilaLinea[]> {
  const { rows } = await c.query<FilaLinea>(
    'SELECT producto_id, nombre, cantidad, precio_centavos FROM pedido_items WHERE pedido_id = $1',
    [pedidoId],
  );
  return rows;
}

function aPedido(f: FilaPedido, lineas: FilaLinea[]): Pedido {
  return Pedido.reconstruir({
    id: f.id,
    tiendaId: f.tienda_id,
    claveIdempotencia: f.clave_idempotencia,
    huella: f.huella,
    estado: f.estado,
    moneda: f.moneda.trim(),
    pagoReferencia: f.pago_referencia,
    comprador: {
      nombre: f.comprador_nombre,
      email: f.comprador_email,
      ...(f.comprador_telefono ? { telefono: f.comprador_telefono } : {}),
    },
    envio: { direccion: f.envio_direccion, ciudad: f.envio_ciudad, codigoPostal: f.envio_codigo_postal },
    creadoEn: new Date(f.creado_en),
    lineas: lineas.map(aLinea),
  });
}

function aLinea(f: FilaLinea): LineaPedido {
  return {
    productoId: f.producto_id,
    nombre: f.nombre,
    cantidad: Number(f.cantidad),
    precioCentavos: Number(f.precio_centavos),
  };
}
