// Tests end-to-end del NFR estrella: aislamiento entre tiendas.
// Uso, desde la raíz del repositorio: npm test
// Ese comando levanta la plataforma con docker compose; acá se espera a que esté lista antes de empezar.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { enTienda, esperarPlataforma, login, pedir } from './plataforma.js';

const sufijo = Date.now().toString(36);
const producto = (nombre) => ({ sku: `TEST-${nombre}-${sufijo}`, nombre: `${nombre} ${sufijo}`, precio: 1000 });

describe('Aislamiento entre tiendas', () => {
  let tokenT1;
  let cargado;

  before(async () => {
    await esperarPlataforma();
    tokenT1 = await login('duenio.t1', 'duenio123');
    const res = await pedir({ metodo: 'POST', ruta: '/v1/tiendas/t1/productos', token: tokenT1, cuerpo: producto('Mate') });
    assert.equal(res.status, 201, `La carga en t1 debería dar 201: ${JSON.stringify(res.json)}`);
    cargado = res.json;
  });

  test('el producto cargado en t1 lo guarda la celda pool', async () => {
    assert.equal(cargado.tiendaId, 't1');
    const res = await pedir({ ruta: '/v1/tiendas/t1/productos' });
    assert.equal(res.headers['x-celda'], 'pool');
  });

  test('un comprador lo ve en el subdominio de t1', async () => {
    const res = await pedir({ ruta: '/v1/productos', host: enTienda('la-yerbera') });
    assert.equal(res.status, 200);
    assert.ok(res.json.some((p) => p.id === cargado.id));
  });

  test('no aparece en t2, aunque comparta la base del pool', async () => {
    const res = await pedir({ ruta: '/v1/productos', host: enTienda('ceramica-nandu') });
    assert.equal(res.status, 200);
    assert.ok(!res.json.some((p) => p.id === cargado.id));
  });

  test('no aparece en p1, que vive en su propia celda', async () => {
    const res = await pedir({ ruta: '/v1/productos', host: enTienda('sastreria-ombu') });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-celda'], 'premium-a');
    assert.ok(!res.json.some((p) => p.id === cargado.id));
  });

  test('el dueño de t1 no puede cargar productos en t2 (403)', async () => {
    const res = await pedir({ metodo: 'POST', ruta: '/v1/tiendas/t2/productos', token: tokenT1, cuerpo: producto('Intruso') });
    assert.equal(res.status, 403);
    assert.equal(res.json.status, 403, 'El error tiene que venir en formato Problem Details');
  });

  test('el dueño de t1 no puede cargar productos en la Premium p1 (403)', async () => {
    const res = await pedir({ metodo: 'POST', ruta: '/v1/tiendas/p1/productos', token: tokenT1, cuerpo: producto('Intruso') });
    assert.equal(res.status, 403);
  });

  test('el dueño de t1 carga desde el panel de su tienda, en su subdominio (201)', async () => {
    const res = await pedir({
      metodo: 'POST',
      ruta: '/v1/productos',
      host: enTienda('la-yerbera'),
      token: tokenT1,
      cuerpo: producto('Bombilla'),
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.tiendaId, 't1');
  });

  test('el dueño de t1 no puede cargar desde el subdominio de otra tienda (403)', async () => {
    const res = await pedir({
      metodo: 'POST',
      ruta: '/v1/productos',
      host: enTienda('ceramica-nandu'),
      token: tokenT1,
      cuerpo: producto('Intruso'),
    });
    assert.equal(res.status, 403);
  });

  test('sin token no se puede cargar (401)', async () => {
    const res = await pedir({ metodo: 'POST', ruta: '/v1/tiendas/t1/productos', cuerpo: producto('Anonimo') });
    assert.equal(res.status, 401);
  });

  test('desde el subdominio de una tienda no se llega a otra (404)', async () => {
    const res = await pedir({ ruta: '/v1/tiendas/t2/productos', host: enTienda('la-yerbera') });
    assert.equal(res.status, 404);
  });

  test('un subdominio que no es de ninguna tienda da 404', async () => {
    const res = await pedir({ ruta: '/v1/productos', host: enTienda('no-existe') });
    assert.equal(res.status, 404);
  });
});
