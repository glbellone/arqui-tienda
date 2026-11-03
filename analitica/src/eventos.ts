import { connect } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { leerEvento, type Totales } from './totales';

/** Exchange donde las celdas publican sus eventos de negocio. Lo declaran los dos lados. */
const EXCHANGE = 'eventos';
/** Cola propia de Analítica: si mañana otro servicio quiere los mismos eventos, se arma la suya. */
const COLA = 'analitica';
const CLAVES = ['producto.creado', 'pedido.confirmado'];

/**
 * Escucha los eventos de las celdas (ADR-006). Publish-Subscribe: las celdas publican en un exchange
 * y no saben quién escucha; Analítica enlaza su propia cola. La conexión se reintenta sola si
 * RabbitMQ se cae o todavía no levantó.
 */
export function escucharEventos(url: string, totales: Totales) {
  const conexion = connect([url]);
  conexion.on('connect', () => console.log('Conectado a RabbitMQ'));
  conexion.on('disconnect', ({ err }) => console.warn('Sin conexión con RabbitMQ, reintentando:', err?.message ?? ''));

  const canal = conexion.createChannel({
    setup: async (ch: ConfirmChannel) => {
      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
      await ch.assertQueue(COLA, { durable: true });
      for (const clave of CLAVES) await ch.bindQueue(COLA, EXCHANGE, clave);
      await ch.prefetch(10);
      await ch.consume(COLA, (mensaje) => {
        if (mensaje) void procesar(ch, mensaje, totales);
      });
    },
  });

  return {
    async cerrar() {
      await canal.close();
      await conexion.close();
    },
  };
}

/**
 * Entrega "al menos una vez": el mensaje se confirma recién después de guardarlo. Si se guarda pero
 * la confirmación se pierde, RabbitMQ lo reenvía y Totales lo descarta por su eventoId.
 */
async function procesar(ch: ConfirmChannel, mensaje: ConsumeMessage, totales: Totales) {
  let evento;
  try {
    evento = leerEvento(JSON.parse(mensaje.content.toString()));
  } catch {
    evento = null;
  }

  if (!evento) {
    // Un mensaje que no entendemos no se arregla reintentando: se descarta.
    console.warn('Evento descartado: formato desconocido');
    ch.ack(mensaje);
    return;
  }

  try {
    await totales.registrar(evento);
    ch.ack(mensaje);
  } catch (error) {
    // Falla la base: se devuelve a la cola para reintentar en unos segundos.
    console.error(`No se pudo registrar ${evento.tipo} de ${evento.tiendaId}:`, error);
    setTimeout(() => {
      try {
        ch.nack(mensaje, false, true);
      } catch {
        // El canal se cerró mientras tanto: RabbitMQ lo reentrega solo al reconectar.
      }
    }, 2000);
  }
}
