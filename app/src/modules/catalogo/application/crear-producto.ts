import { Inject, Injectable } from '@nestjs/common';
import { Precio } from '../domain/precio';
import { Producto } from '../domain/producto';
import { PRODUCTO_REPOSITORY, type ProductoRepository } from '../domain/producto.repository';
import { Sku } from '../domain/sku';
import { TiendaId } from '../domain/tienda-id';

export interface CrearProductoComando {
  tiendaId: string;
  sku: string;
  nombre: string;
  precio: number;
  moneda?: string;
}

/** Caso de uso mínimo del TP: el dueño carga un producto en su tienda. */
@Injectable()
export class CrearProducto {
  constructor(@Inject(PRODUCTO_REPOSITORY) private readonly productos: ProductoRepository) {}

  async ejecutar(comando: CrearProductoComando): Promise<Producto> {
    const producto = Producto.crear({
      tiendaId: TiendaId.crear(comando.tiendaId),
      sku: Sku.crear(comando.sku),
      nombre: comando.nombre,
      precio: Precio.crear(comando.precio, comando.moneda),
    });
    await this.productos.guardar(producto);
    return producto;
  }
}
