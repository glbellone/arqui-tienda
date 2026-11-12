import { Module } from '@nestjs/common';
import type { Sequelize } from 'sequelize';
import { SEQUELIZE } from '../../shared/db/sequelize.provider';
import { ConsultarProductos } from './application/consultar-productos';
import { CrearProducto } from './application/crear-producto';
import { PRODUCTO_REPOSITORY } from './domain/producto.repository';
import { ProductosController } from './http/productos.controller';
import { PRODUCTO_MODEL, definirProductoModel } from './infrastructure/producto.model';
import { SequelizeProductoRepository } from './infrastructure/sequelize-producto.repository';

/**
 * Bounded context Catálogo: los productos y precios de cada tienda.
 * Exporta ConsultarProductos: es lo único que otros módulos (Ventas) pueden usar de Catálogo.
 */
@Module({
  controllers: [ProductosController],
  providers: [
    CrearProducto,
    ConsultarProductos,
    // Cada módulo define sus propios modelos sobre la conexión compartida.
    { provide: PRODUCTO_MODEL, inject: [SEQUELIZE], useFactory: (s: Sequelize) => definirProductoModel(s) },
    { provide: PRODUCTO_REPOSITORY, useClass: SequelizeProductoRepository },
  ],
  exports: [ConsultarProductos],
})
export class CatalogoModule {}
