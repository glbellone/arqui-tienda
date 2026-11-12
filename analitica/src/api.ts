import express, { type NextFunction, type Request, type Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Totales } from './totales';

const jwks = createRemoteJWKSet(
  new URL(process.env.OIDC_JWKS_URL ?? 'http://keycloak:8080/realms/tiendas/protocol/openid-connect/certs'),
);
const issuer = process.env.OIDC_ISSUER;

function problema(res: Response, status: number, title: string, detail: string) {
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title, status, detail });
}

/** Las estadísticas de toda la plataforma son solo para el rol admin (ADR-005 y ADR-006). */
async function soloAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return problema(res, 401, 'No autenticado', 'Falta el token de acceso');
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer });
    const roles = (payload as { realm_access?: { roles?: string[] } }).realm_access?.roles ?? [];
    if (!roles.includes('admin')) return problema(res, 403, 'Prohibido', 'Solo el administrador ve las estadísticas');
    next();
  } catch {
    problema(res, 401, 'No autenticado', 'El token no es válido o expiró');
  }
}

export function crearApi(totales: Totales) {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ estado: 'ok' });
  });

  app.get('/v1/admin/estadisticas', soloAdmin, async (_req, res, next) => {
    try {
      res.json(await totales.listar());
    } catch (error) {
      next(error);
    }
  });

  app.use((_req: Request, res: Response) => problema(res, 404, 'No encontrado', 'Ruta inexistente'));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    problema(res, 500, 'Error interno', 'Ocurrió un error inesperado');
  });

  return app;
}
