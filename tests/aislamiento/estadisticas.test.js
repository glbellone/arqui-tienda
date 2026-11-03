// Tests end-to-end de las estadísticas de la plataforma (ADR-006): las celdas publican eventos en
// RabbitMQ y el servicio de Analítica suma los totales. Uso, desde la raíz del repositorio: npm test

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { enTienda, esperarPlataforma, login, pedir } from './plataforma.js';

const RUTA = '/v1/admin/estadisticas';

async function productosDe(token, tiendaId) {
  const res = await pedir({ ruta: RUTA, token });
  assert.equal(res.status, 200);
  return res.json.find((f) => f.tiendaId === tiendaId)?.productos ?? 0;
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

    // Consistencia eventual: el evento viaja por RabbitMQ, así que se espera hasta 15 segundos.
    let despues = antes;
    for (let intento = 0; intento < 30 && despues === antes; intento++) {
      await new Promise((listo) => setTimeout(listo, 500));
      despues = await productosDe(tokenAdmin, 't2');
    }
    assert.equal(despues, antes + 1);
  });
});
