import { Module } from '@nestjs/common';
import type { Sequelize } from 'sequelize';
import { ModelosPorTienda } from '../../shared/db/modelos-por-tienda';
import { SEQUELIZE } from '../../shared/db/sequelize.provider';
import { ConsultarProductos } from './application/consultar-productos';
import { CrearProducto } from './application/crear-producto';
import { PRODUCTO_REPOSITORY } from './domain/producto.repository';
import { ProductosController } from './http/productos.controller';
import { PRODUCTO_MODEL, definirProductoModel } from './infrastructure/producto.model';
import { SequelizeProductoRepository } from './infrastructure/sequelize-producto.repository';

/** Bounded context Catálogo: los productos y precios de cada tienda. */
@Module({
  controllers: [ProductosController],
  providers: [
    CrearProducto,
    ConsultarProductos,
    // Cada módulo registra sus propios modelos sobre la conexión compartida.
    {
      provide: PRODUCTO_MODEL,
      inject: [SEQUELIZE, ModelosPorTienda],
      useFactory: (sequelize: Sequelize, modelos: ModelosPorTienda) => {
        modelos.registrar(definirProductoModel); // el esquema de la tabla lo crea EsquemaInicializador
        return definirProductoModel(sequelize);
      },
    },
    { provide: PRODUCTO_REPOSITORY, useClass: SequelizeProductoRepository },
  ],
})
export class CatalogoModule {}
