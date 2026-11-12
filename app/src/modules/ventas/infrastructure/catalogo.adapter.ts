import { Injectable } from '@nestjs/common';
import { ConsultarProductos } from '../../catalogo/application/consultar-productos';
import type { Catalogo, ProductoEnVenta } from '../domain/catalogo.port';

/**
 * Implementa el puerto Catalogo de Ventas con el caso de uso público del módulo Catálogo.
 * Ventas no conoce las tablas ni las clases internas de Catálogo: solo recibe lo que necesita para vender.
 */
@Injectable()
export class CatalogoAdapter implements Catalogo {
  constructor(private readonly consultarProductos: ConsultarProductos) {}

  async productosParaVender(tiendaId: string, productoIds: string[]): Promise<ProductoEnVenta[]> {
    // Cada consulta pasa por la RLS de la tienda: un producto de otra tienda da "no encontrado" (404).
    const productos = await Promise.all(productoIds.map((id) => this.consultarProductos.obtener(tiendaId, id)));
    return productos.map((p) => ({ id: p.id, nombre: p.nombre, precioCentavos: p.precio.centavos, moneda: p.precio.moneda }));
  }
}
