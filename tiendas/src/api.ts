import express, { type NextFunction, type Request, type Response } from 'express';
import type { Registro } from './registro';

export function problema(res: Response, status: number, title: string, detail: string) {
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title, status, detail });
}

/** Envuelve un handler async para que los errores lleguen al manejador de errores de Express. */
export const async =
  (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    handler(req, res).catch(next);

export function crearApi(registro: Registro) {
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

  app.use((_req: Request, res: Response) => problema(res, 404, 'No encontrado', 'Ruta inexistente'));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    problema(res, 500, 'Error interno', 'Ocurrió un error inesperado');
  });

  return app;
}
