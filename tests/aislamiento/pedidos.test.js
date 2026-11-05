// Tests end-to-end del checkout (ADR-007): el pedido se cobra en la pasarela, un reintento no cobra
// dos veces y cada tienda ve solo sus pedidos.
// Uso, desde la raíz del repositorio: npm test

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, describe, test } from 'node:test';
import { enTienda, esperarPlataforma, login, pedir } from './plataforma.js';

const YERBERA = enTienda('la-yerbera'); // t1, celda pool
const NANDU = enTienda('ceramica-nandu'); // t2, misma celda pool

const sufijo = Date.now().toString(36);
const PRECIO = 1500;

const COMPRADOR = { nombre: 'Ana Pérez', email: 'ana@example.com', telefono: '11 5555-1234' };
const ENVIO = { direccion: 'Av. Vergara 2222', ciudad: 'Hurlingham', codigoPostal: '1686' };

/** Confirma un pedido desde el subdominio de una tienda, como lo hace el checkout. */
function comprar(host, items, clave = randomUUID(), datos = { comprador: COMPRADOR, envio: ENVIO }) {
  return pedir({ metodo: 'POST', ruta: '/v1/pedidos', host, cuerpo: { items, ...datos }, headers: { 'Idempotency-Key': clave } });
}

describe('Checkout y pedidos', () => {
  let tokenT1;
  let mate; // producto de t1
  let clave; // Idempotency-Key de la primera compra
  let compra; // respuesta de la primera compra

  before(async () => {
    await esperarPlataforma();
    tokenT1 = await login('duenio.t1', 'duenio123');
    const res = await pedir({
      metodo: 'POST',
      ruta: '/v1/tiendas/t1/productos',
      token: tokenT1,
      cuerpo: { sku: `PED-${sufijo}`, nombre: `Mate ${sufijo}`, precio: PRECIO },
    });
    assert.equal(res.status, 201, `La carga del producto debería dar 201: ${JSON.stringify(res.json)}`);
    mate = res.json;

    clave = randomUUID();
    // El cliente manda un precio de mentira: se tiene que ignorar y cobrar el de la tienda.
    compra = await comprar(YERBERA, [{ productoId: mate.id, cantidad: 2, precioCentavos: 1 }], clave);
  });

  test('una compra en t1 se cobra y queda PAGADO (201)', () => {
    assert.equal(compra.status, 201, JSON.stringify(compra.json));
    assert.equal(compra.json.estado, 'PAGADO');
    assert.equal(compra.json.tiendaId, 't1');
    assert.ok(compra.json.pagoReferencia, 'Tiene que guardar el id del cobro de la pasarela');
  });

  test('el total sale de los precios de la tienda, no de lo que manda el cliente', () => {
    assert.equal(compra.json.totalCentavos, PRECIO * 100 * 2);
    assert.equal(compra.json.items[0].precioCentavos, PRECIO * 100);
  });

  test('el pedido guarda los datos del comprador y de la entrega', () => {
    assert.deepEqual(compra.json.comprador, COMPRADOR);
    assert.deepEqual(compra.json.envio, ENVIO);
  });

  test('sin un email válido no se crea el pedido (400)', async () => {
    const res = await comprar(YERBERA, [{ productoId: mate.id, cantidad: 1 }], randomUUID(), {
      comprador: { nombre: 'Ana Pérez', email: 'no-es-un-email' },
      envio: ENVIO,
    });
    assert.equal(res.status, 400);
    assert.match(res.json.detail, /email/);
  });

  test('sin datos de entrega no se crea el pedido (400)', async () => {
    const res = await comprar(YERBERA, [{ productoId: mate.id, cantidad: 1 }], randomUUID(), { comprador: COMPRADOR });
    assert.equal(res.status, 400);
  });

  test('reintentar con la misma Idempotency-Key devuelve el mismo pedido y no cobra de nuevo (200)', async () => {
    const res = await comprar(YERBERA, [{ productoId: mate.id, cantidad: 2 }], clave);
    assert.equal(res.status, 200);
    assert.equal(res.json.id, compra.json.id);
    assert.equal(res.json.pagoReferencia, compra.json.pagoReferencia);
  });

  test('la misma Idempotency-Key con otro carrito da 422', async () => {
    const res = await comprar(YERBERA, [{ productoId: mate.id, cantidad: 5 }], clave);
    assert.equal(res.status, 422);
    assert.equal(res.json.status, 422, 'El error tiene que venir en formato Problem Details');
  });

  test('sin Idempotency-Key da 400', async () => {
    const res = await pedir({
      metodo: 'POST',
      ruta: '/v1/pedidos',
      host: YERBERA,
      cuerpo: { items: [{ productoId: mate.id, cantidad: 1 }], comprador: COMPRADOR, envio: ENVIO },
    });
    assert.equal(res.status, 400);
  });

  test('no se puede comprar un producto de t1 desde la tienda t2 (404)', async () => {
    const res = await comprar(NANDU, [{ productoId: mate.id, cantidad: 1 }]);
    assert.equal(res.status, 404);
  });

  test('si la pasarela rechaza el pago, el pedido queda RECHAZADO (201)', async () => {
    // La pasarela simulada rechaza montos de más de $1.000.000: 1000 × $1500 = $1.500.000.
    const res = await comprar(YERBERA, [{ productoId: mate.id, cantidad: 1000 }]);
    assert.equal(res.status, 201);
    assert.equal(res.json.estado, 'RECHAZADO');
  });

  test('el dueño de t1 ve el pedido en su panel', async () => {
    const res = await pedir({ ruta: '/v1/pedidos', host: YERBERA, token: tokenT1 });
    assert.equal(res.status, 200);
    const pedido = res.json.find((p) => p.id === compra.json.id);
    assert.ok(pedido, 'El pedido tiene que aparecer en el listado');
    assert.equal(pedido.comprador.email, COMPRADOR.email);
  });

  test('el pedido de t1 no aparece en los pedidos de t2, aunque compartan la base', async () => {
    const tokenT2 = await login('duenio.t2', 'duenio123');
    const res = await pedir({ ruta: '/v1/pedidos', host: NANDU, token: tokenT2 });
    assert.equal(res.status, 200);
    assert.ok(!res.json.some((p) => p.id === compra.json.id));
  });

  // El listado tiene datos personales de los compradores: solo lo ve el dueño de la tienda.
  test('sin token no se pueden ver los pedidos (401)', async () => {
    const res = await pedir({ ruta: '/v1/pedidos', host: YERBERA });
    assert.equal(res.status, 401);
  });

  test('un comprador logueado no puede ver los pedidos (403)', async () => {
    const tokenComprador = await login('comprador', 'comprador123');
    const res = await pedir({ ruta: '/v1/pedidos', host: YERBERA, token: tokenComprador });
    assert.equal(res.status, 403);
  });

  test('el dueño de t1 no puede ver los pedidos de t2 (403)', async () => {
    const res = await pedir({ ruta: '/v1/tiendas/t2/pedidos', token: tokenT1 });
    assert.equal(res.status, 403);
    assert.equal(res.json.status, 403, 'El error tiene que venir en formato Problem Details');
  });

  test('el dueño de t1 tampoco los ve entrando por el subdominio de t2 (403)', async () => {
    const res = await pedir({ ruta: '/v1/pedidos', host: NANDU, token: tokenT1 });
    assert.equal(res.status, 403);
  });
});
