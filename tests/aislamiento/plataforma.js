// Funciones compartidas por los tests de punta a punta: pedidos al gateway, login y espera a que
// la plataforma levantada con docker compose esté lista.

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';

export const GATEWAY = new URL(process.env.GATEWAY_URL ?? 'http://localhost:8000');
const KEYCLOAK = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
const DOMINIO = process.env.DOMINIO_BASE ?? 'localhost';

/** Corta cualquier pedido que tarde demasiado. El timer, además, mantiene vivo el proceso mientras se espera. */
const LIMITE_PEDIDO_MS = 10_000;

/**
 * Pedido HTTP con node:http. No se usa fetch: en algunas versiones de Node, si el puerto acepta la
 * conexión y la corta (lo que hace Docker mientras un contenedor arranca), la promesa de fetch
 * queda pendiente para siempre y el test runner termina con "Promise resolution is still pending".
 */
function llamar(url, { metodo = 'GET', host, headers = {}, cuerpo } = {}) {
  const destino = new URL(url);
  const datos = cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  const encabezados = { ...headers, Host: host ?? destino.host };
  if (datos !== undefined) encabezados['Content-Length'] = Buffer.byteLength(datos);

  return new Promise((resolver, rechazar) => {
    const req = request(
      { hostname: destino.hostname, port: destino.port, path: destino.pathname + destino.search, method: metodo, headers: encabezados },
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
        res.on('error', rechazar);
      },
    );
    req.setTimeout(LIMITE_PEDIDO_MS, () => req.destroy(new Error(`Sin respuesta de ${destino.host} en ${LIMITE_PEDIDO_MS} ms`)));
    req.on('error', rechazar);
    if (datos !== undefined) req.write(datos);
    req.end();
  });
}

/** Pedido al gateway con un Host a elección: así se simula entrar por el subdominio de una tienda. */
export function pedir({ metodo = 'GET', ruta, host = GATEWAY.host, token, cuerpo, headers: extra = {} }) {
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  return llamar(new URL(ruta, GATEWAY).href, { metodo, host, headers, cuerpo });
}

export const enTienda = (subdominio) => `${subdominio}.${DOMINIO}`;

/** Datos de contacto y de entrega que manda el checkout. */
export const COMPRADOR = { nombre: 'Ana Pérez', email: 'ana@example.com', telefono: '11 5555-1234' };
export const ENVIO = { direccion: 'Av. Vergara 2222', ciudad: 'Hurlingham', codigoPostal: '1686' };

/** Confirma un pedido desde el subdominio de una tienda, como lo hace el checkout. */
export function comprar(host, items, clave = randomUUID(), datos = { comprador: COMPRADOR, envio: ENVIO }) {
  return pedir({ metodo: 'POST', ruta: '/v1/pedidos', host, cuerpo: { items, ...datos }, headers: { 'Idempotency-Key': clave } });
}

export async function login(usuario, clave) {
  const res = await llamar(`${KEYCLOAK}/realms/tiendas/protocol/openid-connect/token`, {
    metodo: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    cuerpo: new URLSearchParams({ grant_type: 'password', client_id: 'tiendas-web', username: usuario, password: clave }).toString(),
  });
  assert.equal(res.status, 200, `No se pudo loguear ${usuario}: ${JSON.stringify(res.json)}`);
  return res.json.access_token;
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
    'Keycloak': () => responde(() => llamar(`${KEYCLOAK}/realms/tiendas`)),
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
