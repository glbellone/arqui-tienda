// Tests end-to-end de las estadísticas de la plataforma (ADR-006): las celdas publican eventos en
// RabbitMQ y el servicio de Analítica suma los totales. Uso, desde la raíz del repositorio: npm test

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, describe, test } from 'node:test';
import { comprar, enTienda, esperarPlataforma, login, pedir } from './plataforma.js';

const RUTA = '/v1/admin/estadisticas';
const NANDU = enTienda('ceramica-nandu'); // t2

/** Totales de una tienda tal como los ve el administrador (en cero si todavía no tiene). */
async function totalesDe(token, tiendaId) {
  const res = await pedir({ ruta: RUTA, token });
  assert.equal(res.status, 200);
  return res.json.find((f) => f.tiendaId === tiendaId) ?? { productos: 0, pedidosConfirmados: 0, ventasCentavos: 0 };
}

const productosDe = async (token, tiendaId) => (await totalesDe(token, tiendaId)).productos;

/** Consistencia eventual: el evento viaja por RabbitMQ, así que se consulta hasta 15 segundos. */
async function esperarCambio(consultar, antes) {
  let despues = antes;
  for (let intento = 0; intento < 30 && despues === antes; intento++) {
    await new Promise((listo) => setTimeout(listo, 500));
    despues = await consultar();
  }
  return despues;
}

describe('Estadísticas de la plataforma', () => {
  let tokenAdmin;
  let tokenT2;

  before(async () => {
    await esperarPlataforma();
    tokenAdmin = await login('admin', 'admin123');
    tokenT2 = await login('duenio.t2', 'duenio123');
  });

  test('sin token no se ven (401)', async () => {
    const res = await pedir({ ruta: RUTA });
    assert.equal(res.status, 401);
  });

  test('un dueño no las ve: son solo para el administrador (403)', async () => {
    const res = await pedir({ ruta: RUTA, token: tokenT2 });
    assert.equal(res.status, 403);
  });

  test('desde el subdominio de una tienda no se llega a Analítica (404)', async () => {
    const res = await pedir({ ruta: RUTA, host: enTienda('ceramica-nandu'), token: tokenAdmin });
    assert.equal(res.status, 404);
  });

  // Se usa t2 porque los tests de aislamiento, que corren en paralelo, cargan productos en t1.
  test('cargar un producto suma uno en los totales de su tienda', async () => {
    const antes = await productosDe(tokenAdmin, 't2');
    const sufijo = Date.now().toString(36);
    const carga = await pedir({
      metodo: 'POST',
      ruta: '/v1/tiendas/t2/productos',
      token: tokenT2,
      cuerpo: { sku: `EST-${sufijo}`, nombre: `Taza ${sufijo}`, precio: 2500 },
    });
    assert.equal(carga.status, 201);

    const despues = await esperarCambio(() => productosDe(tokenAdmin, 't2'), antes);
    assert.equal(despues, antes + 1);
  });

  test('un pedido pagado suma un pedido y su monto; un pago rechazado o un reintento no suman', async () => {
    const antes = await totalesDe(tokenAdmin, 't2');
    const sufijo = Date.now().toString(36);
    const carga = await pedir({
      metodo: 'POST',
      ruta: '/v1/tiendas/t2/productos',
      token: tokenT2,
      cuerpo: { sku: `VEN-${sufijo}`, nombre: `Plato ${sufijo}`, precio: 1200 },
    });
    assert.equal(carga.status, 201);
    const plato = carga.json.id;

    // La pasarela simulada rechaza más de $1.000.000: 1000 × $1200 no es una venta.
    const rechazado = await comprar(NANDU, [{ productoId: plato, cantidad: 1000 }]);
    assert.equal(rechazado.json.estado, 'RECHAZADO');

    const clave = randomUUID();
    const pagado = await comprar(NANDU, [{ productoId: plato, cantidad: 3 }], clave);
    assert.equal(pagado.json.estado, 'PAGADO');
    const reintento = await comprar(NANDU, [{ productoId: plato, cantidad: 3 }], clave);
    assert.equal(reintento.status, 200);

    const pedidos = await esperarCambio(async () => (await totalesDe(tokenAdmin, 't2')).pedidosConfirmados, antes.pedidosConfirmados);
    // Un poco más de margen, por si llegara un segundo evento que no debería existir.
    await new Promise((listo) => setTimeout(listo, 1000));
    const despues = await totalesDe(tokenAdmin, 't2');

    assert.equal(pedidos, antes.pedidosConfirmados + 1);
    assert.equal(despues.pedidosConfirmados, antes.pedidosConfirmados + 1);
    assert.equal(despues.ventasCentavos, antes.ventasCentavos + 3 * 1200 * 100);
  });
});
