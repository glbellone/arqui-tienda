import { Inject, Injectable } from '@nestjs/common';
import { DominioError } from '../../../shared/domain/dominio.error';
import type { Producto } from '../domain/producto';
import { PRODUCTO_REPOSITORY, type ProductoRepository } from '../domain/producto.repository';
import { TiendaId } from '../domain/tienda-id';

/** El comprador ve los productos de una tienda, y solo de esa tienda. */
@Injectable()
export class ConsultarProductos {
  constructor(@Inject(PRODUCTO_REPOSITORY) private readonly productos: ProductoRepository) {}

  listar(tiendaId: string): Promise<Producto[]> {
    return this.productos.listarPorTienda(TiendaId.crear(tiendaId));
  }

  async obtener(tiendaId: string, id: string): Promise<Producto> {
    const producto = await this.productos.buscarPorId(TiendaId.crear(tiendaId), id);
    if (!producto) throw new DominioError('El producto no existe en esta tienda', 'no-encontrado');
    return producto;
  }
}
