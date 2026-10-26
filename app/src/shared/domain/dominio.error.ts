export type TipoErrorDominio = 'invalido' | 'conflicto' | 'no-encontrado';

/** Error de reglas de negocio. No conoce HTTP: el filtro lo traduce a Problem Details. */
export class DominioError extends Error {
  constructor(message: string, readonly tipo: TipoErrorDominio = 'invalido') {
    super(message);
    this.name = 'DominioError';
  }
}
