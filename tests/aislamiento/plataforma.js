// Funciones compartidas por los tests de punta a punta: pedidos al gateway, login y espera a que
// la plataforma levantada con docker compose esté lista.

import assert from 'node:assert/strict';
import { request } from 'node:http';

export const GATEWAY = new URL(process.env.GATEWAY_URL ?? 'http://localhost:8000');
const KEYCLOAK = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
const DOMINIO = process.env.DOMINIO_BASE ?? 'localhost';

/** Pedido HTTP al gateway con un Host a elección: así se simula entrar por el subdominio de una tienda. */
export function pedir({ metodo = 'GET', ruta, host = GATEWAY.host, token, cuerpo }) {
  const datos = cuerpo ? JSON.stringify(cuerpo) : undefined;
  const headers = { Host: host };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (datos) Object.assign(headers, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) });

  return new Promise((resolver, rechazar) => {
    const req = request(
      { hostname: GATEWAY.hostname, port: GATEWAY.port, path: ruta, method: metodo, headers },
      (res) => {
        let texto = '';
        res.on('data', (parte) => (texto += parte));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(texto);
          } catch {}
          resolver({ status: res.statusCode, headers: res.headers, json });
        });
      },
    );
    req.on('error', rechazar);
    if (datos) req.write(datos);
    req.end();
  });
}

export const enTienda = (subdominio) => `${subdominio}.${DOMINIO}`;

export async function login(usuario, clave) {
  const res = await fetch(`${KEYCLOAK}/realms/tiendas/protocol/openid-connect/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'password', client_id: 'tiendas-web', username: usuario, password: clave }),
  });
  assert.equal(res.status, 200, `No se pudo loguear ${usuario}`);
  return (await res.json()).access_token;
}

const ESPERA_MAXIMA_MS = 3 * 60 * 1000;

/** ¿Responde 200? Si el servicio todavía no levantó, la conexión falla y cuenta como "todavía no". */
async function responde(consulta, estado = 200) {
  try {
    return (await consulta()).status === estado;
  } catch {
    return false;
  }
}

/**
 * Espera a que Keycloak tenga el realm importado y a que el gateway llegue a las dos celdas y a Analítica.
 * Recién levantados, los contenedores tardan unos segundos (Keycloak, bastante más).
 */
export async function esperarPlataforma() {
  const listos = {
    'Keycloak': () => responde(() => fetch(`${KEYCLOAK}/realms/tiendas`)),
    'celda pool': () => responde(() => pedir({ ruta: '/v1/tiendas/t1/productos' })),
    'celda premium-a': () => responde(() => pedir({ ruta: '/v1/tiendas/p1/productos' })),
    // Sin token, Analítica responde 401: alcanza para saber que está levantada.
    'Analítica': () => responde(() => pedir({ ruta: '/v1/admin/estadisticas' }), 401),
  };
  const limite = Date.now() + ESPERA_MAXIMA_MS;
  let avisado = false;

  for (;;) {
    const pendientes = [];
    for (const [nombre, estaListo] of Object.entries(listos)) if (!(await estaListo())) pendientes.push(nombre);
    if (pendientes.length === 0) return;

    if (Date.now() > limite) {
      throw new Error(
        `La plataforma no quedó lista en ${ESPERA_MAXIMA_MS / 60000} minutos (falta: ${pendientes.join(', ')}). ` +
          'Revisá docker compose ps y docker compose logs.',
      );
    }
    if (!avisado) {
      console.log(`Esperando a que la plataforma esté lista (falta: ${pendientes.join(', ')})…`);
      avisado = true;
    }
    await new Promise((listo) => setTimeout(listo, 2000));
  }
}
