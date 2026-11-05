import type { NextFunction, Request, Response } from 'express';

/** Error que se le muestra a quien llamó, con su código HTTP. El resto de los errores salen como 500. */
export class ErrorDeNegocio extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 502,
    message: string,
  ) {
    super(message);
  }
}

const TITULOS: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autenticado',
  403: 'Prohibido',
  404: 'No encontrado',
  409: 'Conflicto',
  500: 'Error interno',
  502: 'Error en un servicio externo',
};

/** Respuesta de error en formato Problem Details (RFC 9457), como el resto de la plataforma. */
export function problema(res: Response, status: number, detail: string) {
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title: TITULOS[status] ?? 'Error', status, detail });
}

/** Envuelve un handler async para que sus errores lleguen al manejador de errores de Express. */
export const async =
  (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    handler(req, res).catch(next);
