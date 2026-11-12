import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from 'sequelize';
import { exigirTransaccionDeTienda } from '../../../shared/db/tenant-guard';
import type { EstadoPedido } from '../domain/pedido';

export const MODELOS_DE_VENTAS = Symbol('MODELOS_DE_VENTAS');

/**
 * Modelos de persistencia de Ventas (tablas `pedidos` y `pedido_items`). Viven solo en
 * infraestructura: el dominio trabaja con el agregado Pedido, nunca con estos modelos.
 * Las tablas, sus restricciones y las políticas de RLS están en app/db/init/001_esquema.sql.
 */
export class PedidoItemModel extends Model<InferAttributes<PedidoItemModel>, InferCreationAttributes<PedidoItemModel>> {
  declare pedidoId: string;
  declare tiendaId: string;
  declare productoId: string;
  declare nombre: string;
  declare cantidad: number;
  /** BIGINT: el driver lo entrega como string. */
  declare precioCentavos: string;
}

export class PedidoModel extends Model<InferAttributes<PedidoModel>, InferCreationAttributes<PedidoModel>> {
  declare id: string;
  declare tiendaId: string;
  declare claveIdempotencia: string;
  declare huella: string;
  declare estado: EstadoPedido;
  /** BIGINT: el driver lo entrega como string. */
  declare totalCentavos: string;
  declare moneda: string;
  declare pagoReferencia: string | null;
  declare compradorNombre: string;
  declare compradorEmail: string;
  declare compradorTelefono: string | null;
  declare envioDireccion: string;
  declare envioCiudad: string;
  declare envioCodigoPostal: string;
  declare creadoEn: Date;
  /** Las líneas del pedido, cuando la consulta las incluye. */
  declare lineas?: NonAttribute<PedidoItemModel[]>;
}

export interface ModelosDeVentas {
  pedidos: typeof PedidoModel;
  items: typeof PedidoItemModel;
}

/** Define los modelos sobre la conexión de la celda y les agrega la guarda de tenancy. */
export function definirModelosDeVentas(sequelize: Sequelize): ModelosDeVentas {
  class Pedido extends PedidoModel {}
  Pedido.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      tiendaId: { type: DataTypes.TEXT, allowNull: false, field: 'tienda_id' },
      claveIdempotencia: { type: DataTypes.TEXT, allowNull: false, field: 'clave_idempotencia' },
      huella: { type: DataTypes.TEXT, allowNull: false },
      estado: { type: DataTypes.TEXT, allowNull: false },
      totalCentavos: { type: DataTypes.BIGINT, allowNull: false, field: 'total_centavos' },
      moneda: { type: DataTypes.CHAR(3), allowNull: false },
      pagoReferencia: { type: DataTypes.TEXT, allowNull: true, field: 'pago_referencia' },
      compradorNombre: { type: DataTypes.TEXT, allowNull: false, field: 'comprador_nombre' },
      compradorEmail: { type: DataTypes.TEXT, allowNull: false, field: 'comprador_email' },
      compradorTelefono: { type: DataTypes.TEXT, allowNull: true, field: 'comprador_telefono' },
      envioDireccion: { type: DataTypes.TEXT, allowNull: false, field: 'envio_direccion' },
      envioCiudad: { type: DataTypes.TEXT, allowNull: false, field: 'envio_ciudad' },
      envioCodigoPostal: { type: DataTypes.TEXT, allowNull: false, field: 'envio_codigo_postal' },
      creadoEn: { type: DataTypes.DATE, allowNull: false, field: 'creado_en' },
    },
    { sequelize, tableName: 'pedidos', modelName: 'Pedido' },
  );

  class PedidoItem extends PedidoItemModel {}
  PedidoItem.init(
    {
      pedidoId: { type: DataTypes.UUID, primaryKey: true, field: 'pedido_id' },
      tiendaId: { type: DataTypes.TEXT, allowNull: false, field: 'tienda_id' },
      productoId: { type: DataTypes.UUID, primaryKey: true, field: 'producto_id' },
      nombre: { type: DataTypes.TEXT, allowNull: false },
      cantidad: { type: DataTypes.INTEGER, allowNull: false },
      precioCentavos: { type: DataTypes.BIGINT, allowNull: false, field: 'precio_centavos' },
    },
    { sequelize, tableName: 'pedido_items', modelName: 'PedidoItem' },
  );

  // La clave foránea ya está en el SQL: la asociación solo sirve para traer las líneas con el pedido.
  Pedido.hasMany(PedidoItem, { as: 'lineas', foreignKey: 'pedidoId', sourceKey: 'id', constraints: false });

  exigirTransaccionDeTienda(Pedido);
  exigirTransaccionDeTienda(PedidoItem);
  return { pedidos: Pedido, items: PedidoItem };
}
