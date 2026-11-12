export const CATALOGO = Symbol('CATALOGO');

/** Lo que Ventas necesita saber de un producto para venderlo. */
export interface ProductoEnVenta {
  id: string;
  nombre: string;
  precioCentavos: number;
  moneda: string;
}

/**
 * Puerto hacia el módulo Catálogo. Ventas no lee la tabla de productos: le pregunta al módulo dueño
 * de esos datos, igual que le pide el cobro a Pagos.
 */
export interface Catalogo {
  /** Los productos pedidos con su precio actual. Falla (no encontrado) si alguno no es de la tienda. */
  productosParaVender(tiendaId: string, productoIds: string[]): Promise<ProductoEnVenta[]>;
}
