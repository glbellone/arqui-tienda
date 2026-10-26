import { randomUUID } from 'node:crypto';
import { DominioError } from '../../../shared/domain/dominio.error';
import { Precio } from './precio';
import { Sku } from './sku';
import { TiendaId } from './tienda-id';

/** Agregado raíz del catálogo: la única puerta de entrada para crear o modificar un producto. */
export class Producto {
  private constructor(
    readonly id: string,
    readonly tiendaId: TiendaId,
    readonly sku: Sku,
    private _nombre: string,
    private _precio: Precio,
  ) {}

  static crear(datos: { tiendaId: TiendaId; sku: Sku; nombre: string; precio: Precio }): Producto {
    return new Producto(randomUUID(), datos.tiendaId, datos.sku, Producto.validarNombre(datos.nombre), datos.precio);
  }

  /** Para reconstruir desde la base, sin volver a generar identidad. */
  static reconstruir(datos: { id: string; tiendaId: TiendaId; sku: Sku; nombre: string; precio: Precio }): Producto {
    return new Producto(datos.id, datos.tiendaId, datos.sku, datos.nombre, datos.precio);
  }

  get nombre(): string {
    return this._nombre;
  }

  get precio(): Precio {
    return this._precio;
  }

  renombrar(nombre: string): void {
    this._nombre = Producto.validarNombre(nombre);
  }

  cambiarPrecio(precio: Precio): void {
    this._precio = precio;
  }

  private static validarNombre(nombre: string): string {
    const limpio = (nombre ?? '').trim();
    if (!limpio || limpio.length > 200) throw new DominioError('El nombre es obligatorio y tiene como máximo 200 caracteres');
    return limpio;
  }
}
