import { Global, Module } from '@nestjs/common';
import { PUBLICADOR_EVENTOS } from '../../application/eventos';
import { RabbitMqPublicador } from './rabbitmq-publicador';

/** Provee el puerto PublicadorDeEventos a todos los módulos, con su adaptador de RabbitMQ. */
@Global()
@Module({
  providers: [{ provide: PUBLICADOR_EVENTOS, useClass: RabbitMqPublicador }],
  exports: [PUBLICADOR_EVENTOS],
})
export class EventosModule {}
