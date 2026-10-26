import { DominioError } from '../../../shared/domain/dominio.error';

/** Value Object: monto + moneda. Se guarda en centavos para no perder precisión. */
export class Precio {
  private constructor(readonly centavos: number, readonly moneda: string) {}

  static crear(monto: number, moneda = 'ARS'): Precio {
    if (typeof monto !== 'number' || !Number.isFinite(monto) || monto < 0) {
      throw new DominioError('El precio tiene que ser un número mayor o igual a cero');
    }
    if (!/^[A-Z]{3}$/.test(moneda)) throw new DominioError('La moneda tiene que ser un código ISO de 3 letras');
    return new Precio(Math.round(monto * 100), moneda);
  }

  static desdeCentavos(centavos: number, moneda: string): Precio {
    return new Precio(centavos, moneda);
  }

  get monto(): number {
    return this.centavos / 100;
  }

  equals(otro: Precio): boolean {
    return this.centavos === otro.centavos && this.moneda === otro.moneda;
  }
}
