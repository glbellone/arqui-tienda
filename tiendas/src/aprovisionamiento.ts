import { hostname } from 'node:os';
import { conTiendaEnCelda } from './celdas-db';
import { Docker, ErrorDeDocker, type ConfigContenedor, type ContenedorInspeccionado } from './docker';
import type { Celda, Registro } from './registro';

const LABEL_PROYECTO = 'com.docker.compose.project';
const LABEL_SERVICIO = 'com.docker.compose.service';
/** Marca los contenedores que creó este servicio: el valor es el nombre de la celda. */
export const LABEL_CELDA = 'tiendas.celda';

const ESPERA_MAXIMA_MS = 60_000;

/** De qué se clona cada contenedor de una celda nueva. */
interface Molde {
  /** Con qué crear el contenedor, en orden de preferencia: el nombre de la imagen y, si no, su id. */
  imagenes: string[];
  env: string[];
  binds: string[];
  red: string;
  proyecto: string;
}

export const nombreDeCelda = (tiendaId: string) => `premium-${tiendaId}`;

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/** Reintenta `intento` hasta que no falle o pase el tiempo máximo. */
async function esperarHasta(descripcion: string, intento: () => Promise<unknown>): Promise<void> {
  const limite = Date.now() + ESPERA_MAXIMA_MS;
  for (;;) {
    try {
      await intento();
      return;
    } catch (error) {
      if (Date.now() > limite) throw new Error(`${descripcion} no respondió en ${ESPERA_MAXIMA_MS / 1000} s: ${String(error)}`);
      await esperar(1000);
    }
  }
}

/**
 * Crea y borra celdas Premium con la API de Docker (ADR-012). Una celda nueva es una copia de la
 * celda pool, con su propia base: misma imagen de la app, mismos scripts de inicio de la base, misma
 * red. En producción esto lo haría Terraform; la idea es la misma: la celda sale de una plantilla.
 */
export class Aprovisionador {
  constructor(
    private readonly registro: Registro,
    private readonly docker = new Docker(),
  ) {}

  /** Levanta la celda de la tienda, espera a que responda y la anota en el registro. */
  async crearCelda(tiendaId: string): Promise<Celda> {
    const nombre = nombreDeCelda(tiendaId);
    const hostDb = `db-${nombre}`;
    const hostApp = `app-${nombre}`;

    // Si quedaron contenedores de un intento anterior, se borran: el nombre tiene que estar libre.
    await this.borrarContenedores(nombre);

    const [db, app] = await Promise.all([this.molde('db-pool'), this.molde('app-pool')]);
    const labels = (servicio: string) => ({
      [LABEL_PROYECTO]: db.proyecto,
      // Con el servicio y oneoff, `docker compose down --remove-orphans` también los borra.
      [LABEL_SERVICIO]: servicio,
      'com.docker.compose.oneoff': 'False',
      [LABEL_CELDA]: nombre,
    });
    const reinicio = { Name: 'unless-stopped' };

    // 1. La base: misma imagen y mismos scripts de init que la pool, así tiene el esquema, RLS y el usuario migrador.
    const idDb = await this.crear(`${db.proyecto}-${hostDb}`, db.imagenes, {
      Env: db.env,
      Labels: labels(hostDb),
      HostConfig: { Binds: db.binds, RestartPolicy: reinicio },
      NetworkingConfig: { EndpointsConfig: { [db.red]: { Aliases: [hostDb] } } },
    });
    await this.docker.arrancar(idDb);

    // 2. La app: el mismo Env que app-pool, con su celda y su base.
    const idApp = await this.crear(`${app.proyecto}-${hostApp}`, app.imagenes, {
      Env: conVariables(app.env, { CELDA: nombre, DB_URL: cambiarHost(valorDe(app.env, 'DB_URL'), hostDb) }),
      Labels: labels(hostApp),
      HostConfig: { RestartPolicy: reinicio },
      NetworkingConfig: { EndpointsConfig: { [app.red]: { Aliases: [hostApp] } } },
    });
    await this.docker.arrancar(idApp);

    // 3. Esperar a que la base acepte al migrador (recién al terminar los scripts de init) y a que la app responda.
    await esperarHasta(`La base ${hostDb}`, () => conTiendaEnCelda(hostDb, tiendaId, (c) => c.query('SELECT 1')));
    const urlApp = `http://${hostApp}:3000`;
    await esperarHasta(`La app ${hostApp}`, async () => {
      const res = await fetch(`${urlApp}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.status !== 200) throw new Error(`respondió ${res.status}`);
    });

    return this.registro.agregarCeldaDinamica({ nombre, urlApp, hostDb });
  }

  /**
   * Borra una celda dinámica: su fila en el registro y sus contenedores (con los datos de su base).
   * Primero la fila: si Docker falla, los contenedores quedan huérfanos y se borran al reiniciar el servicio.
   */
  async borrarCelda(nombre: string): Promise<void> {
    await this.registro.borrarCeldaDinamica(nombre);
    await this.borrarContenedores(nombre);
  }

  /** Al arrancar: contenedores con el label de este servicio cuya celda ya no está en el registro. */
  async borrarHuerfanos(): Promise<string[]> {
    const vigentes = new Set((await this.registro.celdas()).map((c) => c.nombre));
    const proyecto = await this.proyectoPropio();
    const contenedores = await this.docker.listarPorLabel(LABEL_CELDA, ...(proyecto ? [`${LABEL_PROYECTO}=${proyecto}`] : []));
    const huerfanos = contenedores.filter((c) => !vigentes.has(c.Labels[LABEL_CELDA]));
    for (const c of huerfanos) await this.docker.borrar(c.Id);
    return huerfanos.map((c) => c.Names[0]?.replace(/^\//, '') ?? c.Id);
  }

  /**
   * Crea el contenedor con la primera imagen que Docker reconozca. Con el almacén de imágenes de
   * containerd, el id que devuelve `inspect` puede no servir para crear otro contenedor; el nombre sí.
   */
  private async crear(nombre: string, imagenes: string[], config: Omit<ConfigContenedor, 'Image'>): Promise<string> {
    let ultimoError: unknown;
    for (const Image of imagenes) {
      try {
        return await this.docker.crear(nombre, { ...config, Image });
      } catch (error) {
        if (!(error instanceof ErrorDeDocker && error.status === 404)) throw error;
        ultimoError = error;
      }
    }
    throw ultimoError ?? new Error(`No hay imagen para crear ${nombre}`);
  }

  private async borrarContenedores(celda: string): Promise<void> {
    const proyecto = await this.proyectoPropio();
    const filtros = [`${LABEL_CELDA}=${celda}`, ...(proyecto ? [`${LABEL_PROYECTO}=${proyecto}`] : [])];
    for (const c of await this.docker.listarPorLabel(...filtros)) await this.docker.borrar(c.Id);
  }

  /** De qué contenedor de docker-compose se copia la imagen, el entorno, los scripts y la red. */
  private async molde(servicio: string): Promise<Molde> {
    const proyecto = await this.proyectoPropio();
    const filtros = [`${LABEL_SERVICIO}=${servicio}`, ...(proyecto ? [`${LABEL_PROYECTO}=${proyecto}`] : [])];
    const [listado] = await this.docker.listarPorLabel(...filtros);
    if (!listado) throw new Error(`No se encontró el contenedor de ${servicio} para usarlo de molde`);
    const c: ContenedorInspeccionado = await this.docker.inspeccionar(listado.Id);
    const red = Object.keys(c.NetworkSettings.Networks)[0];
    if (!red) throw new Error(`El contenedor de ${servicio} no está en ninguna red`);
    return {
      imagenes: [...new Set([c.Config.Image, c.Image].filter(Boolean))],
      env: c.Config.Env ?? [],
      binds: c.Mounts.filter((m) => m.Type === 'bind').map((m) => `${m.Source}:${m.Destination}${m.RW ? '' : ':ro'}`),
      red,
      proyecto: c.Config.Labels?.[LABEL_PROYECTO] ?? proyecto ?? 'arqui-tienda',
    };
  }

  private proyecto?: Promise<string | undefined>;

  /**
   * El proyecto de docker-compose de este mismo contenedor (su hostname es su id). Sirve para no
   * confundirse si hay otra copia de la plataforma levantada en el mismo Docker.
   */
  private proyectoPropio(): Promise<string | undefined> {
    this.proyecto ??= this.docker
      .inspeccionar(hostname())
      .then((c) => c.Config.Labels?.[LABEL_PROYECTO])
      .catch(() => undefined);
    return this.proyecto;
  }
}

function valorDe(env: string[], clave: string): string {
  const linea = env.find((e) => e.startsWith(`${clave}=`));
  if (!linea) throw new Error(`El molde no tiene la variable ${clave}`);
  return linea.slice(clave.length + 1);
}

/** El mismo entorno, con las variables indicadas reemplazadas (o agregadas). */
function conVariables(env: string[], cambios: Record<string, string>): string[] {
  const resto = env.filter((e) => !Object.keys(cambios).some((clave) => e.startsWith(`${clave}=`)));
  return [...resto, ...Object.entries(cambios).map(([clave, valor]) => `${clave}=${valor}`)];
}

/** postgres://usuario:clave@db-pool:5432/tiendas → el mismo, apuntando a otra base. */
function cambiarHost(url: string, host: string): string {
  const u = new URL(url);
  u.hostname = host;
  return u.toString();
}
