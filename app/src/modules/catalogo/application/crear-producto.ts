import { Inject, Injectable } from '@nestjs/common';
import type { Solicitante } from '../../../shared/application/solicitante';
import { DominioError } from '../../../shared/domain/dominio.error';
import { Precio } from '../domain/precio';
import { Producto } from '../domain/producto';
import { PRODUCTO_REPOSITORY, type ProductoRepository } from '../domain/producto.repository';
import { Sku } from '../domain/sku';
import { TiendaId } from '../domain/tienda-id';

export interface CrearProductoComando {
  /** Quién carga el producto: tiene que ser el dueño de la tienda. */
  solicitante: Solicitante;
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
    const tiendaId = TiendaId.crear(comando.tiendaId);

    // Regla de aislamiento entre tiendas (NFR estrella): un dueño solo carga productos en su propia
    // tienda. Vive acá, en la capa de aplicación, y no en el controller: no depende de HTTP.
    // Que sea dueño (el rol) lo controla antes el AuthGuard; acá se controla que sea el dueño de ESTA tienda.
    if (comando.solicitante.tiendaId !== tiendaId.valor) {
      throw new DominioError('Solo podés cargar productos en tu propia tienda', 'prohibido');
    }

    const producto = Producto.crear({
      tiendaId,
      sku: Sku.crear(comando.sku),
      nombre: comando.nombre,
      precio: Precio.crear(comando.precio, comando.moneda),
    });
    await this.productos.guardar(producto);
    return producto;
  }
}
