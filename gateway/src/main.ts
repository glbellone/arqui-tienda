import express, { type NextFunction, type Request, type Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { readFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';

/** URL de cada celda, por ejemplo {"pool": "http://app-pool:3000"}. */
const celdas: Record<string, string> = JSON.parse(process.env.CELDAS_URLS ?? '{}');

/**
 * Registro tienda → celda. Simplificación del TP: es un archivo.
 * En producción lo provee el módulo Tiendas e Inquilinos.
 */
const registro: Record<string, string> = JSON.parse(
  readFileSync(process.env.REGISTRO_TIENDAS ?? 'registro-tiendas.json', 'utf8'),
);

const jwks = createRemoteJWKSet(
  new URL(process.env.OIDC_JWKS_URL ?? 'http://keycloak:8080/realms/tiendas/protocol/openid-connect/certs'),
);
const issuer = process.env.OIDC_ISSUER;

type RequestConDestino = IncomingMessage & { destino?: string };

function problema(res: Response, status: number, title: string, detail: string) {
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title, status, detail });
}

const app = express();

app.get('/health', (_req, res) => {
  res.json({ estado: 'ok', celdas: Object.keys(celdas) });
});

// 1. Si viene un token, tiene que ser válido. Los roles los controla cada módulo de la app.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return next();
  if (!header.startsWith('Bearer ')) return problema(res, 401, 'No autenticado', 'Formato de token inválido');
  try {
    await jwtVerify(header.slice(7), jwks, { issuer });
    next();
  } catch {
    problema(res, 401, 'No autenticado', 'El token no es válido o expiró');
  }
});

// 2. Resolver en qué celda vive la tienda de la URL.
app.use((req: Request, res: Response, next: NextFunction) => {
  const match = req.path.match(/^\/v1\/tiendas\/([^/]+)/);
  if (!match) return problema(res, 404, 'No encontrado', 'Ruta inexistente');

  const tiendaId = match[1];
  const destino = celdas[registro[tiendaId]];
  if (!destino) return problema(res, 404, 'No encontrado', `La tienda ${tiendaId} no existe`);

  (req as RequestConDestino).destino = destino;
  next();
});

// 3. Reenviar a esa celda. El path no se modifica.
app.use(
  createProxyMiddleware({
    target: 'http://celda-no-resuelta',
    changeOrigin: true,
    router: (req) => (req as RequestConDestino).destino ?? 'http://celda-no-resuelta',
  }),
);

const puerto = Number(process.env.PORT ?? 8000);
app.listen(puerto, () => console.log(`Gateway escuchando en el puerto ${puerto}`));
