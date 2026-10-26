import { Module } from '@nestjs/common';

/**
 * Bounded context Tiendas e Inquilinos: alta de tiendas, plan contratado (Estándar / Premium)
 * y en qué celda vive cada tienda.
 *
 * Pendiente: hoy el registro tienda → celda está en gateway/registro-tiendas.json.
 * Cuando se implemente, este módulo es el dueño de ese registro (ADR-004).
 */
@Module({})
export class TiendasModule {}
