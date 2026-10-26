import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { ROLES_KEY } from './roles.decorator';
import type { Usuario } from './usuario';

const jwks = createRemoteJWKSet(
  new URL(process.env.OIDC_JWKS_URL ?? 'http://keycloak:8080/realms/tiendas/protocol/openid-connect/certs'),
);

/** Valida el token OIDC de Keycloak y los roles pedidos con @Roles (ADR-005). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Falta el token de acceso');

    let payload: JWTPayload;
    try {
      payload = (await jwtVerify(header.slice(7), jwks, { issuer: process.env.OIDC_ISSUER })).payload;
    } catch {
      throw new UnauthorizedException('El token no es válido o expiró');
    }

    const claims = payload as JWTPayload & { realm_access?: { roles?: string[] }; tienda_id?: string };
    const usuario: Usuario = {
      sub: String(claims.sub),
      roles: claims.realm_access?.roles ?? [],
      tiendaId: claims.tienda_id,
    };
    req.usuario = usuario;

    const requeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (requeridos?.length && !requeridos.some((rol) => usuario.roles.includes(rol))) {
      throw new ForbiddenException('Tu rol no permite esta operación');
    }
    return true;
  }
}
