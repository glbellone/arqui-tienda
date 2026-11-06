// Tests end-to-end de los cambios de plan (ADR-012): el dueño lo pide, el admin lo aprueba y el
// servicio de Tiendas muda la tienda con sus datos. A Premium crea una celda nueva con la API de
// Docker; de vuelta a Estándar la tienda vuelve a la pool y esa celda se borra.
// Uso, desde la raíz del repositorio: npm test

import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { comprar, enTienda, esperarPlataforma, login, pedir } from './plataforma.js';

const sufijo = Date.now().toString(36);
const ESPERA_MUDANZA_MS = 3 * 60 * 1000;

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

/** El gateway refresca el registro cada 2 segundos: se reintenta hasta que la respuesta sea la esperada. */
async function esperarEstado(consulta, estado, segundos = 15) {
  let res;
  for (let i = 0; i < segundos * 2; i++) {
    res = await consulta();
    if (res.status === estado) return res;
    await esperar(500);
  }
  return res;
}

/** Aprueba la solicitud abierta de la tienda y espera a que la mudanza termine (hasta 3 minutos). */
async function aprobarYEsperar(tokenAdmin, tiendaId) {
  const lista = await pedir({ ruta: '/v1/admin/solicitudes', token: tokenAdmin });
  assert.equal(lista.status, 200);
  const solicitud = lista.json.find((s) => s.tiendaId === tiendaId && s.estado === 'pendiente');
  assert.ok(solicitud, 'La solicitud tiene que aparecer en la lista del admin');

  const aprobacion = await pedir({ metodo: 'POST', ruta: `/v1/admin/solicitudes/${solicitud.id}/aprobar`, token: tokenAdmin });
  assert.equal(aprobacion.status, 202, JSON.stringify(aprobacion.json));

  let estado;
  const limite = Date.now() + ESPERA_MUDANZA_MS;
  while (Date.now() < limite) {
    const res = await pedir({ ruta: '/v1/admin/solicitudes', token: tokenAdmin });
    estado = res.json.find((s) => s.id === solicitud.id);
    if (estado.estado !== 'en-curso') break;
    await esperar(2000);
  }
  assert.equal(estado.estado, 'completada', `La mudanza terminó en ${estado.estado}: ${estado.error ?? estado.paso}`);
  return estado;
}

describe('Cambios de plan: a Premium y de vuelta a Estándar', () => {
  let tokenAdmin;
  let tokenDuenio;
  let tienda; // la tienda creada para el test
  let host; // su subdominio
  let producto;
  let pedido;

  before(async () => {
    await esperarPlataforma();
    tokenAdmin = await login('admin', 'admin123');

    // Una tienda nueva, en la pool, con un producto y un pedido.
    const alta = await pedir({
      metodo: 'POST',
      ruta: '/v1/admin/tiendas',
      token: tokenAdmin,
      cuerpo: {
        nombre: `Almacén ${sufijo}`,
        subdominio: `almacen-${sufijo}`,
        rubro: 'Tienda de prueba',
        duenio: { nombre: 'Dueño de prueba', email: `almacen-${sufijo}@example.com` },
      },
    });
    assert.equal(alta.status, 201, JSON.stringify(alta.json));
    tienda = alta.json.tienda;
    host = enTienda(tienda.subdominio);
    assert.equal((await esperarEstado(() => pedir({ ruta: '/v1/tienda', host }), 200)).status, 200);

    tokenDuenio = await login(alta.json.duenio.usuario, alta.json.duenio.clave);
    const carga = await pedir({
      metodo: 'POST',
      ruta: '/v1/productos',
      host,
      token: tokenDuenio,
      cuerpo: { sku: `PREM-${sufijo}`, nombre: `Dulce de leche ${sufijo}`, precio: 2500 },
    });
    assert.equal(carga.status, 201, JSON.stringify(carga.json));
    assert.equal(carga.headers['x-celda'], 'pool');
    producto = carga.json;

    const compra = await comprar(host, [{ productoId: producto.id, cantidad: 2 }]);
    assert.equal(compra.status, 201, JSON.stringify(compra.json));
    pedido = compra.json;
  });

  // La tienda se da de baja al final: si ya se mudó, eso borra también su celda.
  after(async () => {
    if (tienda) await pedir({ metodo: 'DELETE', ruta: `/v1/admin/tiendas/${tienda.id}`, token: tokenAdmin });
  });

  test('el dueño pide pasar a Premium (201)', async () => {
    const res = await pedir({ metodo: 'POST', ruta: '/v1/plan/solicitud', host, token: tokenDuenio });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.equal(res.json.estado, 'pendiente');

    const plan = await pedir({ ruta: '/v1/plan', host, token: tokenDuenio });
    assert.equal(plan.status, 200);
    assert.equal(plan.json.plan, 'Estándar');
    assert.equal(plan.json.solicitud.estado, 'pendiente');
  });

  test('pedirlo otra vez da 409', async () => {
    const res = await pedir({ metodo: 'POST', ruta: '/v1/plan/solicitud', host, token: tokenDuenio });
    assert.equal(res.status, 409);
    assert.equal(res.json.status, 409, 'El error tiene que venir en formato Problem Details');
  });

  test('el dueño de otra tienda no puede pedirlo (403)', async () => {
    const tokenT1 = await login('duenio.t1', 'duenio123');
    const res = await pedir({ metodo: 'POST', ruta: `/v1/tiendas/${tienda.id}/plan/solicitud`, token: tokenT1 });
    assert.equal(res.status, 403);
  });

  test('el admin aprueba y la tienda se muda a su celda Premium', async () => {
    const solicitud = await aprobarYEsperar(tokenAdmin, tienda.id);
    assert.equal(solicitud.plan, 'Premium');
    assert.equal(solicitud.celdaDestino, `premium-${tienda.id}`);
  });

  test('después de la mudanza la tienda es Premium', async () => {
    const res = await pedir({ ruta: '/v1/tienda', host });
    assert.equal(res.status, 200);
    assert.equal(res.json.plan, 'Premium');
  });

  test('el producto sigue estando y lo atiende la celda nueva', async () => {
    const res = await pedir({ ruta: '/v1/productos', host });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-celda'], `premium-${tienda.id}`);
    assert.ok(
      res.json.some((p) => p.id === producto.id),
      'El producto cargado antes de la mudanza tiene que seguir estando',
    );
  });

  test('el dueño ve su pedido', async () => {
    const res = await pedir({ ruta: '/v1/pedidos', host, token: tokenDuenio });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.headers['x-celda'], `premium-${tienda.id}`);
    const encontrado = res.json.find((p) => p.id === pedido.id);
    assert.ok(encontrado, 'El pedido hecho antes de la mudanza tiene que seguir estando');
    assert.equal(encontrado.items.length, 1);
  });

  test('una tienda Premium no puede volver a pedir Premium (409)', async () => {
    const res = await pedir({ metodo: 'POST', ruta: '/v1/plan/solicitud', host, token: tokenDuenio, cuerpo: { plan: 'Premium' } });
    assert.equal(res.status, 409);
  });

  test('el dueño pide volver a Estándar y el admin lo aprueba', async () => {
    const res = await pedir({ metodo: 'POST', ruta: '/v1/plan/solicitud', host, token: tokenDuenio, cuerpo: { plan: 'Estándar' } });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.equal(res.json.plan, 'Estándar');

    const solicitud = await aprobarYEsperar(tokenAdmin, tienda.id);
    assert.equal(solicitud.celdaOrigen, `premium-${tienda.id}`);
    assert.equal(solicitud.celdaDestino, 'pool');
  });

  test('de vuelta en la pool, con sus productos y pedidos', async () => {
    const perfil = await pedir({ ruta: '/v1/tienda', host });
    assert.equal(perfil.json.plan, 'Estándar');

    const productos = await pedir({ ruta: '/v1/productos', host });
    assert.equal(productos.headers['x-celda'], 'pool');
    assert.ok(productos.json.some((p) => p.id === producto.id), 'El producto tiene que volver con la tienda');

    const pedidos = await pedir({ ruta: '/v1/pedidos', host, token: tokenDuenio });
    assert.equal(pedidos.status, 200);
    assert.ok(pedidos.json.some((p) => p.id === pedido.id), 'El pedido tiene que volver con la tienda');
  });

  test('la celda Premium que se creó para la tienda ya no existe', async () => {
    // El gateway lista las celdas que conoce: la de la tienda tiene que haber salido del registro.
    let celdas = [];
    for (let i = 0; i < 10; i++) {
      celdas = (await pedir({ ruta: '/health' })).json.celdas;
      if (!celdas.includes(`premium-${tienda.id}`)) break;
      await esperar(500);
    }
    assert.ok(!celdas.includes(`premium-${tienda.id}`), `El gateway todavía conoce premium-${tienda.id}`);
    assert.ok(celdas.includes('premium-a'), 'Las celdas de docker-compose no se tocan');
  });
});
