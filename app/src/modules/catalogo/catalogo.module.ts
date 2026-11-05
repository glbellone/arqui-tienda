import { Module } from '@nestjs/common';
import { ConsultarProductos } from './application/consultar-productos';
import { CrearProducto } from './application/crear-producto';
import { PRODUCTO_REPOSITORY } from './domain/producto.repository';
import { ProductosController } from './http/productos.controller';
import { PgProductoRepository } from './infrastructure/pg-producto.repository';

/**
 * Bounded context Catálogo: los productos y precios de cada tienda.
 * Exporta ConsultarProductos: es lo único que otros módulos (Ventas) pueden usar de Catálogo.
 */
@Module({
  controllers: [ProductosController],
  providers: [CrearProducto, ConsultarProductos, { provide: PRODUCTO_REPOSITORY, useClass: PgProductoRepository }],
  exports: [ConsultarProductos],
})
export class CatalogoModule {}
