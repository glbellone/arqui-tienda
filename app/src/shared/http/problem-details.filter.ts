import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DominioError } from '../domain/dominio.error';

const TITULOS: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autenticado',
  403: 'Prohibido',
  404: 'No encontrado',
  409: 'Conflicto',
  422: 'Regla de negocio incumplida',
  500: 'Error interno',
};

const STATUS_DOMINIO = { invalido: 422, conflicto: 409, 'no-encontrado': 404 } as const;

/** Todas las respuestas de error salen en formato Problem Details (RFC 9457). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    let status = 500;
    let detail = 'Ocurrió un error inesperado';

    if (error instanceof DominioError) {
      status = STATUS_DOMINIO[error.tipo];
      detail = error.message;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      const cuerpo = error.getResponse();
      const mensaje = typeof cuerpo === 'string' ? cuerpo : (cuerpo as { message?: string | string[] }).message;
      detail = Array.isArray(mensaje) ? mensaje.join('; ') : (mensaje ?? error.message);
    } else {
      console.error(error);
    }

    res
      .status(status)
      .type('application/problem+json')
      .json({ type: 'about:blank', title: TITULOS[status] ?? 'Error', status, detail, instance: req.originalUrl });
  }
}
