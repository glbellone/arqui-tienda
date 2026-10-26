import { DominioError } from '../../../shared/domain/dominio.error';

/** Value Object: identifica al inquilino. Todo dato del catálogo pertenece a una tienda. */
export class TiendaId {
  private constructor(readonly valor: string) {}

  static crear(valor: string): TiendaId {
    if (!/^[a-z0-9-]{1,40}$/.test(valor ?? '')) throw new DominioError('Identificador de tienda inválido');
    return new TiendaId(valor);
  }

  equals(otro: TiendaId): boolean {
    return this.valor === otro.valor;
  }
}
