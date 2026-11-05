import express, { type NextFunction, type Request, type Response } from 'express';
import { autenticar, exigirRol } from './auth';
import { leerNuevaTienda, type GestionDeTiendas } from './gestion';
import { async, ErrorDeNegocio, problema } from './http';
import type { Registro, Tienda } from './registro';

const urlPublica = process.env.URL_PUBLICA_TIENDA ?? 'http://{subdominio}.localhost:5173';

/** La tienda tal como la ve el administrador, con la dirección donde se publica. */
const aDto = (t: Tienda) => ({ ...t, url: urlPublica.replace('{subdominio}', t.subdominio) });

export function crearApi(registro: Registro, gestion: GestionDeTiendas) {
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

  app.use('/v1/admin', admin);

  app.use((_req: Request, res: Response) => problema(res, 404, 'Ruta inexistente'));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ErrorDeNegocio) return problema(res, error.status, error.message);
    if ((error as { type?: string }).type === 'entity.parse.failed') return problema(res, 400, 'El cuerpo no es un JSON válido');
    console.error(error);
    problema(res, 500, 'Ocurrió un error inesperado');
  });

  return app;
}
