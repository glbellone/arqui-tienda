import { Pool } from 'pg';
import { crearApi } from './api';
import { GestionDeTiendas } from './gestion';
import { Keycloak } from './keycloak';
import { Registro } from './registro';

/**
 * Tiendas e Inquilinos (ADR-012): el plano de control de la plataforma. Es un servicio aparte de las
 * celdas porque el registro tiene que ser uno solo, y la app corre una vez por celda.
 */
const db = new Pool({ connectionString: process.env.DB_URL });
const registro = new Registro(db);
const gestion = new GestionDeTiendas(registro, new Keycloak());

const puerto = Number(process.env.PORT ?? 3000);
const servidor = crearApi(registro, gestion).listen(puerto, () => console.log(`Tiendas escuchando en el puerto ${puerto}`));

async function apagar() {
  servidor.close();
  await db.end();
  process.exit(0);
}

process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
