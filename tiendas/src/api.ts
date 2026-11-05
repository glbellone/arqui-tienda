import express, { type NextFunction, type Request, type Response } from 'express';
import { autenticar, exigirRol, type Usuario } from './auth';
import { leerNuevaTienda, type GestionDeTiendas } from './gestion';
import { async, ErrorDeNegocio, problema } from './http';
import type { Mudanzas } from './mudanza';
import type { Registro, SolicitudPremium, Tienda } from './registro';

const urlPublica = process.env.URL_PUBLICA_TIENDA ?? 'http://{subdominio}.localhost:5173';

/** La tienda tal como la ve el administrador, con la dirección donde se publica. */
const aDto = (t: Tienda) => ({ ...t, url: urlPublica.replace('{subdominio}', t.subdominio) });

/**
 * La solicitud tal como la ve el dueño: solo en qué estado está. Los pasos de la mudanza y la celda
 * son detalles de la arquitectura que el dueño no ve; para él es "Plan Premium".
 */
const aSolicitudDelDuenio = (s: SolicitudPremium | null) =>
  s && { id: s.id, estado: s.estado, creadaEn: s.creadaEn, actualizadaEn: s.actualizadaEn };

export function crearApi(registro: Registro, gestion: GestionDeTiendas, mudanzas: Mudanzas) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ estado: 'ok' });
  });

  // Para el gateway: el registro completo. Es interna: el gateway no expone /interno hacia afuera.
  app.get(
    '/interno/registro',
    async(async (_req, res) => {
      res.json(await registro.instantanea());
    }),
  );

  // --- Administración de la plataforma: solo el rol admin ---
  const admin = express.Router();
  admin.use(autenticar, exigirRol('admin', 'Solo el administrador gestiona las tiendas'));

  admin.get(
    '/tiendas',
    async(async (_req, res) => {
      res.json((await registro.tiendas()).map(aDto));
    }),
  );

  admin.post(
    '/tiendas',
    async(async (req, res) => {
      const { tienda, duenio } = await gestion.crear(leerNuevaTienda(req.body));
      res.status(201).location(`/v1/admin/tiendas/${tienda.id}`).json({ tienda: aDto(tienda), duenio });
    }),
  );

  admin.delete(
    '/tiendas/:id',
    async(async (req, res) => {
      await gestion.darDeBaja(req.params.id);
      res.status(204).end();
    }),
  );

  // Pase a Premium: el admin ve todas las solicitudes, con el paso de la mudanza en curso.
  admin.get(
    '/solicitudes',
    async(async (_req, res) => {
      const [solicitudes, tiendas] = await Promise.all([registro.solicitudes(), registro.tiendas()]);
      const porId = new Map(tiendas.map((t) => [t.id, t]));
      res.json(
        solicitudes.map((s) => {
          const t = porId.get(s.tiendaId);
          return { ...s, tienda: t && { nombre: t.nombre, subdominio: t.subdominio, plan: t.plan, celda: t.celda, color: t.color } };
        }),
      );
    }),
  );

  admin.post(
    '/solicitudes/:id/aprobar',
    async(async (req, res) => {
      res.status(202).json(await mudanzas.aprobar(req.params.id));
    }),
  );

  admin.post(
    '/solicitudes/:id/rechazar',
    async(async (req, res) => {
      res.json(await mudanzas.rechazar(req.params.id));
    }),
  );

  app.use('/v1/admin', admin);

  // --- Plan de la tienda: solo su dueño (rol duenio y el mismo tienda_id) ---
  const plan = express.Router({ mergeParams: true });
  plan.use(autenticar, exigirRol('duenio', 'Solo el dueño de la tienda gestiona su plan'), (req, res, next) => {
    const { tiendaId } = res.locals.usuario as Usuario;
    if (tiendaId !== (req.params as { id: string }).id) return problema(res, 403, 'Solo el dueño de la tienda gestiona su plan');
    next();
  });

  plan.get(
    '/',
    async(async (req, res) => {
      const id = (req.params as { id: string }).id;
      const tienda = await registro.tienda(id);
      if (!tienda) throw new ErrorDeNegocio(404, `La tienda ${id} no existe`);
      res.json({ plan: tienda.plan, solicitud: aSolicitudDelDuenio(await registro.ultimaSolicitud(id)) });
    }),
  );

  plan.post(
    '/solicitud',
    async(async (req, res) => {
      const id = (req.params as { id: string }).id;
      const solicitud = await mudanzas.solicitar(id);
      res.status(201).location(`/v1/tiendas/${id}/plan`).json(aSolicitudDelDuenio(solicitud));
    }),
  );

  app.use('/v1/tiendas/:id/plan', plan);

  app.use((_req: Request, res: Response) => problema(res, 404, 'Ruta inexistente'));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ErrorDeNegocio) return problema(res, error.status, error.message);
    if ((error as { type?: string }).type === 'entity.parse.failed') return problema(res, 400, 'El cuerpo no es un JSON válido');
    console.error(error);
    problema(res, 500, 'Ocurrió un error inesperado');
  });

  return app;
}
