import type { Aprovisionador } from './aprovisionamiento';
import { nombreDeCelda } from './aprovisionamiento';
import { borrarDatosDeTienda, conTiendaEnCelda, TABLAS_DE_TIENDA } from './celdas-db';
import { ErrorDeNegocio } from './http';
import type { Celda, PasoMudanza, Registro, SolicitudPremium } from './registro';

/**
 * Cuánto se espera para que el gateway vea un cambio en el registro: lo relee cada 2 s, así que
 * con 6 s alcanza aunque pierda una lectura. También deja terminar los pedidos que estaban en curso.
 */
const ESPERA_GATEWAY_MS = Number(process.env.ESPERA_GATEWAY_MS ?? 6000);

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

type Filas = Record<string, Record<string, unknown>[]>;

/**
 * Pase de Estándar a Premium (ADR-012). El dueño lo pide, el admin lo aprueba y la tienda se muda a
 * una celda nueva, solo para ella:
 *
 *   1. creando-celda        la celda nueva, con la API de Docker.
 *   2. frenando-escrituras  la tienda pasa a `mudandose`: el gateway rechaza las escrituras (503).
 *   3. copiando-datos       tabla por tabla, con el usuario migrador (pasa por RLS).
 *   4. verificando          las cantidades de filas tienen que coincidir.
 *   5. cambiando-ruteo      plan, celda y estado en un solo UPDATE: desde acá, la tienda vive en la celda nueva.
 *   6. limpiando-pool       se borran los datos viejos de la pool.
 *
 * Si algo falla antes del paso 5, se deshace todo y la tienda sigue como estaba.
 */
export class Mudanzas {
  constructor(
    private readonly registro: Registro,
    private readonly aprovisionador: Aprovisionador,
  ) {}

  /** El dueño pide el pase. 409 si ya es Premium o si ya tiene una solicitud abierta. */
  async solicitar(tiendaId: string): Promise<SolicitudPremium> {
    const tienda = await this.registro.tienda(tiendaId);
    if (!tienda) throw new ErrorDeNegocio(404, `La tienda ${tiendaId} no existe`);
    if (tienda.plan === 'Premium') throw new ErrorDeNegocio(409, 'Tu tienda ya tiene el plan Premium');
    try {
      return await this.registro.crearSolicitud(tiendaId);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ErrorDeNegocio(409, 'Ya pediste el plan Premium: tu solicitud está en trámite');
      }
      throw error;
    }
  }

  /** El admin aprueba: la solicitud pasa a en-curso y la mudanza sigue en segundo plano. */
  async aprobar(id: string): Promise<SolicitudPremium> {
    const solicitud = await this.pendiente(id);
    const tienda = await this.registro.tienda(solicitud.tiendaId);
    if (!tienda) throw new ErrorDeNegocio(404, `La tienda ${solicitud.tiendaId} ya no existe`);
    if (tienda.plan === 'Premium') throw new ErrorDeNegocio(409, `La tienda ${tienda.id} ya es Premium`);
    const origen = await this.registro.celda(tienda.celda);
    if (!origen) throw new Error(`La celda ${tienda.celda} no está en el registro`);

    // La celda destino se anota desde el principio: si el servicio se cae a mitad de camino, al
    // arrancar se sabe qué contenedores borrar.
    const enCurso = await this.registro.actualizarSolicitud(
      id,
      { estado: 'en-curso', paso: 'creando-celda', celdaDestino: nombreDeCelda(tienda.id), error: null },
      'pendiente',
    );
    if (!enCurso) throw new ErrorDeNegocio(409, 'La solicitud ya no está pendiente');

    void this.mudar(enCurso, origen).catch((error) => console.error(`Mudanza ${id}: error inesperado`, error));
    return enCurso;
  }

  async rechazar(id: string): Promise<SolicitudPremium> {
    await this.pendiente(id);
    const rechazada = await this.registro.actualizarSolicitud(id, { estado: 'rechazada' }, 'pendiente');
    if (!rechazada) throw new ErrorDeNegocio(409, 'La solicitud ya no está pendiente');
    return rechazada;
  }

  /**
   * Al arrancar el servicio: las mudanzas que quedaron a medias. Si la tienda ya estaba en la celda
   * nueva, la mudanza terminó (solo puede faltar limpiar la pool); si no, se deshace.
   */
  async recuperar(): Promise<void> {
    for (const s of await this.registro.solicitudes('en-curso')) {
      const tienda = await this.registro.tienda(s.tiendaId);
      if (tienda && s.celdaDestino && tienda.celda === s.celdaDestino) {
        const pool = await this.registro.celdaPool();
        await borrarDatosDeTienda(pool.hostDb, tienda.id).catch((e) => console.error(`No se pudo limpiar la pool para ${tienda.id}`, e));
        await this.registro.actualizarSolicitud(s.id, { estado: 'completada', paso: null });
        console.log(`Mudanza ${s.id}: ya estaba hecha, queda completada`);
      } else {
        await this.deshacer(s, new Error('El servicio de Tiendas se reinició en medio de la mudanza'));
      }
    }
    const borrados = await this.aprovisionador.borrarHuerfanos();
    if (borrados.length) console.log(`Contenedores huérfanos borrados: ${borrados.join(', ')}`);
  }

  private async pendiente(id: string): Promise<SolicitudPremium> {
    const solicitud = /^[0-9a-f-]{36}$/i.test(id) ? await this.registro.solicitud(id) : null;
    if (!solicitud) throw new ErrorDeNegocio(404, `La solicitud ${id} no existe`);
    if (solicitud.estado !== 'pendiente') throw new ErrorDeNegocio(409, `La solicitud ya está ${solicitud.estado}`);
    return solicitud;
  }

  private async mudar(solicitud: SolicitudPremium, origen: Celda): Promise<void> {
    const { id, tiendaId } = solicitud;
    const paso = (p: PasoMudanza) => this.registro.actualizarSolicitud(id, { paso: p });
    let ruteoCambiado = false;

    try {
      // 1. La celda nueva, con su base vacía y su app.
      const destino = await this.aprovisionador.crearCelda(tiendaId);

      // 2. Desde acá el gateway responde 503 a las escrituras. Se espera a que lo vea y a que
      //    terminen los pedidos que ya estaban adentro.
      await paso('frenando-escrituras');
      await this.registro.cambiarEstado(tiendaId, 'mudandose');
      await esperar(ESPERA_GATEWAY_MS);

      // 3. Copia: todo se lee del origen y se escribe en el destino en una sola transacción.
      await paso('copiando-datos');
      const filas = await leerTodo(origen.hostDb, tiendaId);
      await escribirTodo(destino.hostDb, tiendaId, filas);

      // 4. Las dos bases tienen que tener lo mismo.
      await paso('verificando');
      const [antes, despues] = await Promise.all([contar(origen.hostDb, tiendaId), contar(destino.hostDb, tiendaId)]);
      for (const tabla of TABLAS_DE_TIENDA) {
        if (antes[tabla] !== despues[tabla]) {
          throw new Error(`En ${tabla} hay ${antes[tabla]} filas en ${origen.nombre} y ${despues[tabla]} en ${destino.nombre}`);
        }
      }

      // 5. El cambio de ruteo es un solo UPDATE. Se espera a que el gateway lo vea antes de borrar el origen.
      await paso('cambiando-ruteo');
      await this.registro.pasarAPremium(tiendaId, destino.nombre);
      ruteoCambiado = true;
      await esperar(ESPERA_GATEWAY_MS);

      // 6. Los datos viejos ya no los lee nadie.
      await paso('limpiando-pool');
      await borrarDatosDeTienda(origen.hostDb, tiendaId);
      await this.registro.actualizarSolicitud(id, { estado: 'completada', paso: null });
      console.log(`Mudanza ${id}: la tienda ${tiendaId} ya vive en ${destino.nombre}`);
    } catch (error) {
      if (!ruteoCambiado) return this.deshacer(solicitud, error);
      // La tienda ya está en su celda nueva y funciona: solo quedaron datos viejos en la pool.
      console.error(`Mudanza ${id}: no se pudieron borrar los datos viejos de ${origen.nombre}`, error);
      await this.registro.actualizarSolicitud(id, {
        estado: 'completada',
        paso: null,
        error: `La tienda se mudó, pero no se pudieron borrar sus datos de ${origen.nombre}: ${mensaje(error)}`,
      });
    }
  }

  /** Vuelve todo a como estaba: la tienda activa en su celda, sin la celda nueva. */
  private async deshacer(solicitud: SolicitudPremium, error: unknown): Promise<void> {
    console.error(`Mudanza ${solicitud.id}: falló, se deshace`, error);
    await this.registro.cambiarEstado(solicitud.tiendaId, 'activa').catch(console.error);
    if (solicitud.celdaDestino) await this.aprovisionador.borrarCelda(solicitud.celdaDestino).catch(console.error);
    await this.registro.actualizarSolicitud(solicitud.id, { estado: 'fallida', error: mensaje(error) });
  }
}

const mensaje = (error: unknown) => (error instanceof Error ? error.message : String(error));

function leerTodo(hostDb: string, tiendaId: string): Promise<Filas> {
  return conTiendaEnCelda(hostDb, tiendaId, async (c) => {
    const filas: Filas = {};
    for (const tabla of TABLAS_DE_TIENDA) filas[tabla] = (await c.query(`SELECT * FROM ${tabla}`)).rows;
    return filas;
  });
}

/** En orden de tablas, porque pedido_items depende de pedidos. Si falla una fila, no queda nada a medias. */
function escribirTodo(hostDb: string, tiendaId: string, filas: Filas): Promise<void> {
  return conTiendaEnCelda(hostDb, tiendaId, async (c) => {
    for (const tabla of TABLAS_DE_TIENDA) {
      for (const fila of filas[tabla]) {
        const columnas = Object.keys(fila);
        const marcadores = columnas.map((_, i) => `$${i + 1}`).join(', ');
        await c.query(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores})`, Object.values(fila));
      }
    }
  });
}

function contar(hostDb: string, tiendaId: string): Promise<Record<string, number>> {
  return conTiendaEnCelda(hostDb, tiendaId, async (c) => {
    const cantidades: Record<string, number> = {};
    for (const tabla of TABLAS_DE_TIENDA) cantidades[tabla] = Number((await c.query(`SELECT count(*) FROM ${tabla}`)).rows[0].count);
    return cantidades;
  });
}
