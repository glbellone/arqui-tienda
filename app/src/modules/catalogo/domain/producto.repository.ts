import type { Producto } from './producto';
import type { TiendaId } from './tienda-id';

export const PRODUCTO_REPOSITORY = Symbol('PRODUCTO_REPOSITORY');

/**
 * Puerto del dominio. La implementación decide cómo y dónde se guarda;
 * el dominio no sabe si la base es la compartida o una Premium.
 */
export interface ProductoRepository {
  guardar(producto: Producto): Promise<void>;
  listarPorTienda(tiendaId: TiendaId): Promise<Producto[]>;
  buscarPorId(tiendaId: TiendaId, id: string): Promise<Producto | null>;
}
