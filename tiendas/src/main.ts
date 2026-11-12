import { Pool } from 'pg';
import { crearApi } from './api';
import { Aprovisionador } from './aprovisionamiento';
import { GestionDeTiendas } from './gestion';
import { Keycloak } from './keycloak';
import { Mudanzas } from './mudanza';
import { Registro } from './registro';

/**
 * Tiendas e Inquilinos (ADR-012): el plano de control de la plataforma. Es un servicio aparte de las
 * celdas porque el registro tiene que ser uno solo, y la app corre una vez por celda.
 */
const db = new Pool({ connectionString: process.env.DB_URL });
const registro = new Registro(db);
const aprovisionador = new Aprovisionador(registro);
const gestion = new GestionDeTiendas(registro, new Keycloak(), aprovisionador);
const mudanzas = new Mudanzas(registro, aprovisionador);

const puerto = Number(process.env.PORT ?? 3000);
const servidor = crearApi(registro, gestion, mudanzas).listen(puerto, () => console.log(`Tiendas escuchando en el puerto ${puerto}`));

// Si el servicio se cayó a mitad de una mudanza, se termina o se deshace, y se borran los contenedores
// que hayan quedado sin celda en el registro.
mudanzas.recuperar().catch((error) => console.error('No se pudieron revisar las mudanzas pendientes', error));

async function apagar() {
  servidor.close();
  await db.end();
  process.exit(0);
}

process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
