import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';

/** Junta los mensajes de un cuerpo inválido, también los de objetos anidados, sin repetirlos. */
function mensajes(errores: ValidationError[]): string[] {
  return errores.flatMap((e) => [...Object.values(e.constraints ?? {}), ...mensajes(e.children ?? [])]);
}

/**
 * Valida los cuerpos que tienen un DTO con decoradores de class-validator y descarta los campos que no
 * están declarados (por ejemplo, un precio que mande el cliente). El error sale como Problem Details (400)
 * con los mensajes tal cual: Nest, por defecto, les antepone la ruta del campo ("comprador.El email…").
 */
export const validacion = new ValidationPipe({
  whitelist: true,
  transform: true,
  exceptionFactory: (errores) => new BadRequestException([...new Set(mensajes(errores))]),
});
