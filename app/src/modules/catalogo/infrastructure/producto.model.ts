import {
  DataTypes,
  Model,
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
 * La tabla, sus restricciones y la política de RLS están en app/db/init/001_esquema.sql.
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

/** Define el modelo sobre la conexión de la celda y le agrega la guarda de tenancy. */
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
    },
  );
  exigirTransaccionDeTienda(Producto);
  return Producto;
}
