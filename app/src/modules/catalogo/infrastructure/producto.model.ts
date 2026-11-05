import {
  DataTypes,
  Model,
  Op,
  QueryTypes,
  Sequelize,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { exigirTransaccionDeTienda } from '../../../shared/db/tenant-guard';

export const PRODUCTO_MODEL = Symbol('PRODUCTO_MODEL');

/**
 * Modelo de persistencia (tabla `productos`). Vive solo en infraestructura:
 * el dominio trabaja con el agregado Producto, nunca con este modelo.
 */
export class ProductoModel extends Model<InferAttributes<ProductoModel>, InferCreationAttributes<ProductoModel>> {
  declare id: string;
  declare tiendaId: string;
  declare sku: string;
  declare nombre: string;
  /** BIGINT: el driver lo entrega como string. */
  declare precioCentavos: string;
  declare moneda: string;
  declare creadoEn: CreationOptional<Date>;
}

/**
 * Define el modelo sobre la conexión indicada. Crea una subclase nueva en cada llamada porque
 * el mismo modelo se define sobre dos conexiones: la de la app y la de administración (esquema).
 */
export function definirProductoModel(sequelize: Sequelize): typeof ProductoModel {
  class Producto extends ProductoModel {}
  Producto.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      tiendaId: { type: DataTypes.TEXT, allowNull: false, field: 'tienda_id' },
      sku: { type: DataTypes.TEXT, allowNull: false },
      nombre: { type: DataTypes.TEXT, allowNull: false },
      precioCentavos: { type: DataTypes.BIGINT, allowNull: false, field: 'precio_centavos' },
      moneda: { type: DataTypes.CHAR(3), allowNull: false },
      // La base lo completa con now(); las actualizaciones no lo tocan.
      creadoEn: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('now'), field: 'creado_en' },
    },
    {
      sequelize,
      tableName: 'productos',
      modelName: 'Producto',
      // Un SKU es único dentro de una tienda (puede repetirse entre tiendas).
      indexes: [{ unique: true, name: 'productos_tienda_sku_uq', fields: ['tienda_id', 'sku'] }],
      hooks: {
        // El CHECK de la base como segunda barrera: el precio ya se valida en el dominio (Precio).
        afterSync: async () => {
          const nombre = 'productos_precio_no_negativo';
          const existentes = await sequelize.query('SELECT 1 FROM pg_constraint WHERE conname = :nombre', {
            replacements: { nombre },
            type: QueryTypes.SELECT,
          });
          if (existentes.length === 0) {
            await sequelize.getQueryInterface().addConstraint('productos', {
              type: 'check',
              name: nombre,
              fields: ['precio_centavos'],
              where: { precio_centavos: { [Op.gte]: 0 } },
            });
          }
        },
      },
    },
  );
  exigirTransaccionDeTienda(Producto);
  return Producto;
}
