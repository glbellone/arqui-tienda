import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { connect, type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';
import { randomUUID } from 'node:crypto';
import type { EventoDeNegocio, PublicadorDeEventos } from '../../application/eventos';

/** Exchange de tipo topic: la clave de ruteo es el tipo de evento ("producto.creado"). */
const EXCHANGE = 'eventos';

/**
 * Adaptador del puerto PublicadorDeEventos con RabbitMQ (ADR-006). Publish-Subscribe: la celda
 * publica en el exchange y no sabe quién escucha. Si RabbitMQ no está, la conexión se reintenta
 * sola y los eventos esperan en memoria; la celda sigue atendiendo igual.
 */
@Injectable()
export class RabbitMqPublicador implements PublicadorDeEventos, OnModuleDestroy {
  private readonly log = new Logger('Eventos');
  private readonly conexion: AmqpConnectionManager;
  private readonly canal: ChannelWrapper;

  constructor() {
    this.conexion = connect([process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672']);
    this.conexion.on('disconnect', ({ err }) => this.log.warn(`Sin conexión con RabbitMQ: ${err?.message ?? ''}`));
    this.canal = this.conexion.createChannel({
      json: true,
      setup: async (ch: ConfirmChannel) => {
        await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
      },
    });
  }

  publicar(evento: EventoDeNegocio): void {
    const { tipo, ...datos } = evento;
    const mensaje = {
      eventoId: randomUUID(),
      tipo,
      ...datos,
      celda: process.env.CELDA ?? 'local',
      ocurridoEn: new Date().toISOString(),
    };
    this.canal
      .publish(EXCHANGE, tipo, mensaje, { persistent: true, contentType: 'application/json' })
      .catch((error: unknown) => this.log.warn(`No se pudo publicar ${tipo}: ${String(error)}`));
  }

  async onModuleDestroy() {
    await this.canal.close();
    await this.conexion.close();
  }
}
