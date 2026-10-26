import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface Usuario {
  sub: string;
  roles: string[];
  /** Solo lo tienen los dueños: la tienda que administran (claim tienda_id de Keycloak). */
  tiendaId?: string;
}

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Usuario => ctx.switchToHttp().getRequest().usuario,
);
