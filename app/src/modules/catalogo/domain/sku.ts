import { DominioError } from '../../../shared/domain/dominio.error';

/** Value Object: código del producto, único dentro de su tienda. */
export class Sku {
  private constructor(readonly valor: string) {}

  static crear(valor: string): Sku {
    const limpio = (valor ?? '').trim().toUpperCase();
    if (!limpio || limpio.length > 64) throw new DominioError('El SKU es obligatorio y tiene como máximo 64 caracteres');
    return new Sku(limpio);
  }
}
