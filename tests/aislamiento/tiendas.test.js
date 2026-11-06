// Tests end-to-end del alta y la baja de tiendas (ADR-012): el servicio de Tiendas registra la tienda,
// el gateway la empieza a rutear y el dueño nuevo puede ingresar y cargar productos.
// Uso, desde la raíz del repositorio: npm test

import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { enTienda, esperarPlataforma, login, pedir, puedeIngresar } from './plataforma.js';

const RUTA = '/v1/admin/tiendas';
const sufijo = Date.now().toString(36);

/** El gateway refresca el registro cada 2 segundos: se reintenta hasta que la respuesta sea la esperada. */
async function esperarEstado(consulta, estado, segundos = 15) {
  let res;
  for (let i = 0; i < segundos * 2; i++) {
    res = await consulta();
    if (res.status === estado) return res;
    await new Promise((listo) => setTimeout(listo, 500));
  }
  return res;
}

describe('Alta y baja de tiendas', () => {
  let tokenAdmin;
  const creadas = [];

  const nueva = (nombre, extra = {}) => ({
    nombre: `${nombre} ${sufijo}`,
    subdominio: `${nombre.toLowerCase()}-${sufijo}`,
    rubro: 'Tienda de prueba',
    duenio: { nombre: 'Dueña de prueba', email: `${nombre.toLowerCase()}-${sufijo}@example.com` },
    ...extra,
  });

  async function crear(datos) {
    const res = await pedir({ metodo: 'POST', ruta: RUTA, token: tokenAdmin, cuerpo: datos });
    if (res.status === 201) creadas.push(res.json.tienda.id);
    return res;
  }

  before(async () => {
    await esperarPlataforma();
    tokenAdmin = await login('admin', 'admin123');
  });

  // Lo que crean los tests se da de baja al final, para no dejar tiendas sueltas.
  after(async () => {
    for (const id of creadas) await pedir({ metodo: 'DELETE', ruta: `${RUTA}/${id}`, token: tokenAdmin });
  });

  test('sin token no se ven las tiendas (401)', async () => {
    assert.equal((await pedir({ ruta: RUTA })).status, 401);
  });

  test('un dueño no administra la plataforma (403)', async () => {
    const tokenDuenio = await login('duenio.t1', 'duenio123');
    assert.equal((await pedir({ ruta: RUTA, token: tokenDuenio })).status, 403);
  });

  test('el admin ve las tiendas de ejemplo con su plan y su celda', async () => {
    const res = await pedir({ ruta: RUTA, token: tokenAdmin });
    assert.equal(res.status, 200);
    const p1 = res.json.find((t) => t.id === 'p1');
    assert.equal(p1.plan, 'Premium');
    assert.equal(p1.celda, 'premium-a');
    assert.equal(res.json.find((t) => t.id === 't1').celda, 'pool');
  });

  test('una tienda nueva se publica en su subdominio y su dueño puede cargar productos en el pool', async () => {
    const datos = nueva('Vivero');
    const alta = await crear(datos);
    assert.equal(alta.status, 201, JSON.stringify(alta.json));
    assert.equal(alta.json.tienda.plan, 'Estándar');
    assert.equal(alta.json.tienda.celda, 'pool');
    assert.ok(alta.json.duenio.clave, 'Tiene que devolver la contraseña inicial del dueño');

    const host = enTienda(datos.subdominio);
    const perfil = await esperarEstado(() => pedir({ ruta: '/v1/tienda', host }), 200);
    assert.equal(perfil.status, 200, 'El gateway tiene que empezar a rutear la tienda nueva');
    assert.equal(perfil.json.nombre, datos.nombre);

    const token = await login(alta.json.duenio.usuario, alta.json.duenio.clave);
    const carga = await pedir({
      metodo: 'POST',
      ruta: '/v1/productos',
      host,
      token,
      cuerpo: { sku: `ALTA-${sufijo}`, nombre: `Helecho ${sufijo}`, precio: 4200 },
    });
    assert.equal(carga.status, 201, JSON.stringify(carga.json));
    assert.equal(carga.headers['x-celda'], 'pool');
    assert.equal(carga.json.tiendaId, alta.json.tienda.id);
  });

  test('el dueño nuevo no puede cargar productos en otra tienda (403)', async () => {
    const datos = nueva('Libreria');
    const alta = await crear(datos);
    assert.equal(alta.status, 201);
    const token = await login(alta.json.duenio.usuario, alta.json.duenio.clave);
    const res = await pedir({ metodo: 'POST', ruta: '/v1/tiendas/t1/productos', token, cuerpo: { sku: `X-${sufijo}`, nombre: 'Intruso', precio: 1 } });
    assert.equal(res.status, 403);
  });

  test('un subdominio que ya usa otra tienda da 409', async () => {
    const res = await crear(nueva('Repetida', { subdominio: 'la-yerbera' }));
    assert.equal(res.status, 409);
  });

  test('datos inválidos dan 400 y explican qué falta', async () => {
    const res = await crear({ nombre: '', subdominio: 'NO VALE', rubro: '', duenio: { nombre: '', email: 'no-es-email' } });
    assert.equal(res.status, 400);
    assert.match(res.json.detail, /subdominio/);
    assert.match(res.json.detail, /email/);
  });

  test('la baja saca la tienda del aire y su dueño ya no puede ingresar', async () => {
    const datos = nueva('Kiosco');
    const alta = await crear(datos);
    assert.equal(alta.status, 201);
    const host = enTienda(datos.subdominio);
    await esperarEstado(() => pedir({ ruta: '/v1/tienda', host }), 200);

    const baja = await pedir({ metodo: 'DELETE', ruta: `${RUTA}/${alta.json.tienda.id}`, token: tokenAdmin });
    assert.equal(baja.status, 204);
    creadas.splice(creadas.indexOf(alta.json.tienda.id), 1);

    assert.equal((await esperarEstado(() => pedir({ ruta: '/v1/tienda', host }), 404)).status, 404);
    assert.equal(await puedeIngresar(alta.json.duenio.usuario, alta.json.duenio.clave), false);
  });
});
