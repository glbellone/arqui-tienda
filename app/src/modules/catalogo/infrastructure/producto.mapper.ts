import { Precio } from '../domain/precio';
import { Producto } from '../domain/producto';
import { Sku } from '../domain/sku';
import { TiendaId } from '../domain/tienda-id';
import type { ProductoModel } from './producto.model';

/** Traduce entre el modelo de Sequelize y el agregado del dominio. */
export const ProductoMapper = {
  aDominio(fila: ProductoModel): Producto {
    return Producto.reconstruir({
      id: fila.id,
      tiendaId: TiendaId.crear(fila.tiendaId),
      sku: Sku.crear(fila.sku),
      nombre: fila.nombre,
      precio: Precio.desdeCentavos(Number(fila.precioCentavos), fila.moneda),
    });
  },

  aFila(p: Producto) {
    return {
      id: p.id,
      tiendaId: p.tiendaId.valor,
      sku: p.sku.valor,
      nombre: p.nombre,
      precioCentavos: String(p.precio.centavos),
      moneda: p.precio.moneda,
    };
  },
};
