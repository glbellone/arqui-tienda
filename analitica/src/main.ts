import { Pool } from 'pg';
import { crearApi } from './api';
import { escucharEventos } from './eventos';
import { Totales } from './totales';

/**
 * Servicio de Analítica (ADR-006): un contenedor aparte, con su propia base. Las celdas no lo
 * conocen: publican eventos en RabbitMQ y Analítica los escucha. Expone los totales al admin.
 */
const db = new Pool({ connectionString: process.env.DB_URL });
const totales = new Totales(db);
const eventos = escucharEventos(process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672', totales);

const puerto = Number(process.env.PORT ?? 3000);
const servidor = crearApi(totales).listen(puerto, () => console.log(`Analítica escuchando en el puerto ${puerto}`));

async function apagar() {
  servidor.close();
  await eventos.cerrar();
  await db.end();
  process.exit(0);
}

process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
