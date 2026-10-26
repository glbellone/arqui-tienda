import express, { type NextFunction, type Request, type Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { IncomingMessage } from 'node:http';
import { Registro, subdominioDeTienda, type TiendaRegistrada } from './registro';

/** URL de cada celda, por ejemplo {"pool": "http://app-pool:3000"}. */
const celdas: Record<string, string> = JSON.parse(process.env.CELDAS_URLS ?? '{}');

const registro = Registro.desdeArchivo(process.env.REGISTRO_TIENDAS ?? 'registro-tiendas.json');

/** Dominio bajo el cual se publica cada tienda: {subdominio}.{DOMINIO_BASE} (ADR-011). */
const dominioBase = process.env.DOMINIO_BASE ?? 'localhost';

/** Plantilla de la URL pública de una tienda, para que el panel pueda enlazarla. */
const urlPublica = process.env.URL_PUBLICA_TIENDA ?? 'http://{subdominio}.localhost:5173';

const jwks = createRemoteJWKSet(
  new URL(process.env.OIDC_JWKS_URL ?? 'http://keycloak:8080/realms/tiendas/protocol/openid-connect/certs'),
);
const issuer = process.env.OIDC_ISSUER;

type RequestConDestino = IncomingMessage & { destino?: string };

function problema(res: Response, status: number, title: string, detail: string) {
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title, status, detail });
}

function perfilPublico(id: string, tienda: TiendaRegistrada) {
  return {
    id,
    nombre: tienda.nombre,
    rubro: tienda.rubro,
    plan: tienda.plan,
    color: tienda.color,
    url: urlPublica.replace('{subdominio}', tienda.subdominio),
  };
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

// 2. Si el pedido llega al subdominio de una tienda, la tienda sale del host (ADR-011).
//    En ese dominio solo se puede llegar a esa tienda: /v1/productos se traduce a
//    /v1/tiendas/{id}/productos, el contrato que entiende la app (ADR-009).
app.use((req: Request, res: Response, next: NextFunction) => {
  const subdominio = subdominioDeTienda(req.headers.host, dominioBase);
  if (!subdominio) return next();

  const tiendaId = registro.idDelSubdominio(subdominio);
  if (!tiendaId) return problema(res, 404, 'No encontrado', `No hay ninguna tienda en ${subdominio}.${dominioBase}`);

  if (!req.url.startsWith('/v1/') || req.url.startsWith('/v1/tiendas/')) {
    return problema(res, 404, 'No encontrado', 'Ruta inexistente');
  }
  req.url = req.url === '/v1/tienda' ? `/v1/tiendas/${tiendaId}` : `/v1/tiendas/${tiendaId}/${req.url.slice(4)}`;
  next();
});

// 3. Resolver en qué celda vive la tienda de la URL.
app.use((req: Request, res: Response, next: NextFunction) => {
  const match = req.path.match(/^\/v1\/tiendas\/([^/]+)(\/.*)?$/);
  if (!match) return problema(res, 404, 'No encontrado', 'Ruta inexistente');

  const [, tiendaId, resto] = match;
  const tienda = registro.buscar(tiendaId);
  const destino = tienda && celdas[tienda.celda];
  if (!tienda || !destino) return problema(res, 404, 'No encontrado', `La tienda ${tiendaId} no existe`);

  // El perfil público de la tienda lo responde el gateway con el registro, hasta que exista el módulo Tiendas.
  if (!resto || resto === '/') {
    if (req.method !== 'GET') return problema(res, 405, 'Método no permitido', 'Solo se puede consultar la tienda');
    return void res.json(perfilPublico(tiendaId, tienda));
  }

  (req as RequestConDestino).destino = destino;
  next();
});

// 4. Reenviar a esa celda.
app.use(
  createProxyMiddleware({
    target: 'http://celda-no-resuelta',
    changeOrigin: true,
    router: (req) => (req as RequestConDestino).destino ?? 'http://celda-no-resuelta',
  }),
);

const puerto = Number(process.env.PORT ?? 8000);
app.listen(puerto, () => console.log(`Gateway escuchando en el puerto ${puerto}`));
