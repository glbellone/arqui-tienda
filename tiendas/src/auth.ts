import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { problema } from './http';

export interface Usuario {
  sub: string;
  roles: string[];
  /** Solo los dueños: la tienda que administran (claim tienda_id). */
  tiendaId?: string;
}

const jwks = createRemoteJWKSet(
  new URL(process.env.OIDC_JWKS_URL ?? 'http://keycloak:8080/realms/tiendas/protocol/openid-connect/certs'),
);
const issuer = process.env.OIDC_ISSUER;

/** Valida el token de Keycloak (ADR-005) y deja el usuario en res.locals.usuario. */
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return problema(res, 401, 'Falta el token de acceso');
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer });
    const claims = payload as JWTPayload & { realm_access?: { roles?: string[] }; tienda_id?: string };
    const usuario: Usuario = { sub: String(claims.sub), roles: claims.realm_access?.roles ?? [], tiendaId: claims.tienda_id };
    res.locals.usuario = usuario;
    next();
  } catch {
    problema(res, 401, 'El token no es válido o expiró');
  }
}

/** Después de autenticar: solo deja pasar al rol indicado. */
export const exigirRol = (rol: string, mensaje: string) => (_req: Request, res: Response, next: NextFunction) =>
  (res.locals.usuario as Usuario).roles.includes(rol) ? next() : problema(res, 403, mensaje);
