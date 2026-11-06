import express, { type NextFunction, type Request, type Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { IncomingMessage } from 'node:http';
import { Registro, subdominioDeTienda, type TiendaRegistrada } from './registro';

/** Servicio de Tiendas (ADR-012): el registro, y el resto de la administración de la plataforma. */
const tiendas = process.env.TIENDAS_URL ?? 'http://tiendas:3000';

/** Registro de tiendas y celdas: lo provee el servicio de Tiendas (ADR-012). */
const registro = new Registro(tiendas, Number(process.env.REGISTRO_INTERVALO_MS ?? 2000));
registro.iniciar();

/** Dominio bajo el cual se publica cada tienda: {subdominio}.{DOMINIO_BASE} (ADR-011). */
const dominioBase = process.env.DOMINIO_BASE ?? 'localhost';

/** Plantilla de la URL pública de una tienda, para que el panel pueda enlazarla. */
const urlPublica = process.env.URL_PUBLICA_TIENDA ?? 'http://{subdominio}.localhost:5173';

/** Servicio de Analítica (ADR-006): atiende /v1/admin/estadisticas. */
const analitica = process.env.ANALITICA_URL;

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
  res.json({ estado: registro.listo ? 'ok' : 'iniciando', celdas: registro.celdas() });
});

// 0. Hasta tener el registro, el gateway no sabe a dónde mandar nada.
app.use((_req: Request, res: Response, next: NextFunction) => {
  if (registro.listo) return next();
  res.setHeader('Retry-After', '5');
  problema(res, 503, 'No disponible', 'La plataforma está iniciando. Probá de nuevo en unos segundos.');
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

// 3. Las rutas de administración de la plataforma no son de ninguna tienda: las estadísticas van a
//    Analítica y el resto (tiendas, solicitudes) al servicio de Tiendas. Llegan solo desde el dominio
//    de la plataforma; en el subdominio de una tienda el paso 2 ya las tradujo a /v1/tiendas/{id}/...
app.use('/v1/admin', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/estadisticas')) {
    if (!analitica) return problema(res, 503, 'No disponible', 'El servicio de Analítica no está configurado');
    (req as RequestConDestino).destino = analitica;
  } else {
    (req as RequestConDestino).destino = tiendas;
  }
  next();
});

/** Métodos que no escriben: siguen andando mientras la tienda se muda. */
const LECTURAS = new Set(['GET', 'HEAD', 'OPTIONS']);

// 4. Resolver en qué celda vive la tienda de la URL.
app.use((req: Request, res: Response, next: NextFunction) => {
  if ((req as RequestConDestino).destino) return next();
  const match = req.path.match(/^\/v1\/tiendas\/([^/]+)(\/.*)?$/);
  if (!match) return problema(res, 404, 'No encontrado', 'Ruta inexistente');

  const [, tiendaId, resto] = match;
  const tienda = registro.buscar(tiendaId);
  const destino = tienda && registro.urlDeCelda(tienda.celda);
  if (!tienda || !destino) return problema(res, 404, 'No encontrado', `La tienda ${tiendaId} no existe`);

  // El perfil público de la tienda lo responde el gateway con su copia del registro (ADR-012).
  if (!resto || resto === '/') {
    if (req.method !== 'GET') return problema(res, 405, 'Método no permitido', 'Solo se puede consultar la tienda');
    return void res.json(perfilPublico(tiendaId, tienda));
  }

  // El plan de la tienda lo gestiona el servicio de Tiendas, no la celda (ADR-012). Desde el
  // subdominio, /v1/plan ya llega acá traducido a /v1/tiendas/{id}/plan.
  if (resto === '/plan' || resto.startsWith('/plan/')) {
    (req as RequestConDestino).destino = tiendas;
    return next();
  }

  // Mientras la tienda se muda de celda, se leen los datos de la celda vieja pero no se escriben:
  // lo que se escriba ahí se perdería en la copia (ADR-012).
  if (tienda.estado === 'mudandose' && !LECTURAS.has(req.method)) {
    res.setHeader('Retry-After', '30');
    return problema(res, 503, 'No disponible', 'La tienda se está actualizando. Probá de nuevo en un minuto.');
  }

  (req as RequestConDestino).destino = destino;
  next();
});

// 5. Reenviar al destino: la celda de la tienda, Tiendas o Analítica.
app.use(
  createProxyMiddleware({
    target: 'http://celda-no-resuelta',
    changeOrigin: true,
    router: (req) => (req as RequestConDestino).destino ?? 'http://celda-no-resuelta',
  }),
);

const puerto = Number(process.env.PORT ?? 8000);
app.listen(puerto, () => console.log(`Gateway escuchando en el puerto ${puerto}`));
