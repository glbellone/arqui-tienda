import type { Pool } from 'pg';

export type Plan = 'Estándar' | 'Premium';
export type EstadoTienda = 'activa' | 'mudandose';

export interface Tienda {
  id: string;
  subdominio: string;
  nombre: string;
  rubro: string;
  color: string;
  plan: Plan;
  celda: string;
  estado: EstadoTienda;
  creadaEn: string;
}

export interface Celda {
  nombre: string;
  tipo: 'pool' | 'premium';
  urlApp: string;
  hostDb: string;
  dinamica: boolean;
}

export type EstadoSolicitud = 'pendiente' | 'en-curso' | 'completada' | 'fallida' | 'rechazada';

/** Pasos de la mudanza a Premium, en orden (ADR-012). */
export type PasoMudanza =
  | 'creando-celda'
  | 'frenando-escrituras'
  | 'copiando-datos'
  | 'verificando'
  | 'cambiando-ruteo'
  | 'limpiando-pool';

export interface SolicitudPremium {
  id: string;
  tiendaId: string;
  estado: EstadoSolicitud;
  paso: PasoMudanza | null;
  celdaDestino: string | null;
  error: string | null;
  creadaEn: string;
  actualizadaEn: string;
}

/** Lo que necesita el gateway para rutear: las tiendas y la URL de cada celda. */
export interface Instantanea {
  tiendas: Record<string, Omit<Tienda, 'id' | 'creadaEn'>>;
  celdas: Record<string, string>;
}

const aTienda = (f: Record<string, unknown>): Tienda => ({
  id: f.id as string,
  subdominio: f.subdominio as string,
  nombre: f.nombre as string,
  rubro: f.rubro as string,
  color: f.color as string,
  plan: f.plan as Plan,
  celda: f.celda as string,
  estado: f.estado as EstadoTienda,
  creadaEn: new Date(f.creada_en as string).toISOString(),
});

const aCelda = (f: Record<string, unknown>): Celda => ({
  nombre: f.nombre as string,
  tipo: f.tipo as Celda['tipo'],
  urlApp: f.url_app as string,
  hostDb: f.host_db as string,
  dinamica: f.dinamica as boolean,
});

const aSolicitud = (f: Record<string, unknown>): SolicitudPremium => ({
  id: f.id as string,
  tiendaId: f.tienda_id as string,
  estado: f.estado as EstadoSolicitud,
  paso: (f.paso as PasoMudanza | null) ?? null,
  celdaDestino: (f.celda_destino as string | null) ?? null,
  error: (f.error as string | null) ?? null,
  creadaEn: new Date(f.creada_en as string).toISOString(),
  actualizadaEn: new Date(f.actualizada_en as string).toISOString(),
});

/** Acceso a la base del registro. Es la única fuente de verdad sobre tiendas y celdas. */
export class Registro {
  constructor(readonly db: Pool) {}

  async tiendas(): Promise<Tienda[]> {
    const { rows } = await this.db.query('SELECT * FROM tiendas ORDER BY creada_en, id');
    return rows.map(aTienda);
  }

  async tienda(id: string): Promise<Tienda | null> {
    const { rows } = await this.db.query('SELECT * FROM tiendas WHERE id = $1', [id]);
    return rows[0] ? aTienda(rows[0]) : null;
  }

  async celdas(): Promise<Celda[]> {
    const { rows } = await this.db.query('SELECT * FROM celdas ORDER BY creada_en, nombre');
    return rows.map(aCelda);
  }

  async celda(nombre: string): Promise<Celda | null> {
    const { rows } = await this.db.query('SELECT * FROM celdas WHERE nombre = $1', [nombre]);
    return rows[0] ? aCelda(rows[0]) : null;
  }

  /** Id para una tienda nueva: t100, t101… */
  async proximoId(): Promise<string> {
    const { rows } = await this.db.query("SELECT 't' || nextval('numero_de_tienda') AS id");
    return rows[0].id as string;
  }

  /** La celda compartida donde empiezan las tiendas nuevas. */
  async celdaPool(): Promise<Celda> {
    const { rows } = await this.db.query("SELECT * FROM celdas WHERE tipo = 'pool' ORDER BY creada_en LIMIT 1");
    if (!rows[0]) throw new Error('No hay ninguna celda pool en el registro');
    return aCelda(rows[0]);
  }

  async agregarTienda(t: Omit<Tienda, 'estado' | 'creadaEn'>): Promise<void> {
    await this.db.query(
      `INSERT INTO tiendas (id, subdominio, nombre, rubro, color, plan, celda) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [t.id, t.subdominio, t.nombre, t.rubro, t.color, t.plan, t.celda],
    );
  }

  async borrarTienda(id: string): Promise<void> {
    await this.db.query('DELETE FROM tiendas WHERE id = $1', [id]);
  }

  async cambiarEstado(id: string, estado: EstadoTienda): Promise<void> {
    await this.db.query('UPDATE tiendas SET estado = $2 WHERE id = $1', [id, estado]);
  }

  /** El cambio de ruteo de la mudanza: plan, celda y estado en un solo UPDATE, para que el gateway nunca vea un estado intermedio. */
  async pasarAPremium(id: string, celda: string): Promise<void> {
    await this.db.query("UPDATE tiendas SET plan = 'Premium', celda = $2, estado = 'activa' WHERE id = $1", [id, celda]);
  }

  // --- Celdas creadas por este servicio (ADR-012) ---

  async agregarCeldaDinamica(c: Omit<Celda, 'tipo' | 'dinamica'>): Promise<Celda> {
    const { rows } = await this.db.query(
      `INSERT INTO celdas (nombre, tipo, url_app, host_db, dinamica) VALUES ($1, 'premium', $2, $3, true) RETURNING *`,
      [c.nombre, c.urlApp, c.hostDb],
    );
    return aCelda(rows[0]);
  }

  /** Solo borra celdas dinámicas: las de docker-compose no se tocan. */
  async borrarCeldaDinamica(nombre: string): Promise<void> {
    await this.db.query('DELETE FROM celdas WHERE nombre = $1 AND dinamica', [nombre]);
  }

  // --- Solicitudes de pase a Premium ---

  async crearSolicitud(tiendaId: string): Promise<SolicitudPremium> {
    const { rows } = await this.db.query('INSERT INTO solicitudes_premium (tienda_id) VALUES ($1) RETURNING *', [tiendaId]);
    return aSolicitud(rows[0]);
  }

  async solicitud(id: string): Promise<SolicitudPremium | null> {
    const { rows } = await this.db.query('SELECT * FROM solicitudes_premium WHERE id = $1', [id]);
    return rows[0] ? aSolicitud(rows[0]) : null;
  }

  /** La última solicitud de una tienda, abierta o no: el dueño ve cómo terminó la última vez. */
  async ultimaSolicitud(tiendaId: string): Promise<SolicitudPremium | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM solicitudes_premium WHERE tienda_id = $1 ORDER BY creada_en DESC LIMIT 1',
      [tiendaId],
    );
    return rows[0] ? aSolicitud(rows[0]) : null;
  }

  async solicitudes(estado?: EstadoSolicitud): Promise<SolicitudPremium[]> {
    const { rows } = estado
      ? await this.db.query('SELECT * FROM solicitudes_premium WHERE estado = $1 ORDER BY creada_en DESC', [estado])
      : await this.db.query('SELECT * FROM solicitudes_premium ORDER BY creada_en DESC');
    return rows.map(aSolicitud);
  }

  /**
   * Cambia los campos indicados de una solicitud. Si se pasa `desde`, solo la cambia si está en ese
   * estado (devuelve null si no): así dos admins no aprueban la misma solicitud a la vez.
   */
  async actualizarSolicitud(
    id: string,
    cambios: Partial<Pick<SolicitudPremium, 'estado' | 'paso' | 'celdaDestino' | 'error'>>,
    desde?: EstadoSolicitud,
  ): Promise<SolicitudPremium | null> {
    const columnas: Record<string, string> = { estado: 'estado', paso: 'paso', celdaDestino: 'celda_destino', error: 'error' };
    const sets: string[] = [];
    const valores: unknown[] = [id];
    for (const [campo, valor] of Object.entries(cambios)) {
      valores.push(valor);
      sets.push(`${columnas[campo]} = $${valores.length}`);
    }
    let condicion = '';
    if (desde) {
      valores.push(desde);
      condicion = ` AND estado = $${valores.length}`;
    }
    const { rows } = await this.db.query(
      `UPDATE solicitudes_premium SET ${[...sets, 'actualizada_en = now()'].join(', ')} WHERE id = $1${condicion} RETURNING *`,
      valores,
    );
    return rows[0] ? aSolicitud(rows[0]) : null;
  }

  async instantanea(): Promise<Instantanea> {
    const [tiendas, celdas] = await Promise.all([this.tiendas(), this.celdas()]);
    return {
      tiendas: Object.fromEntries(tiendas.map(({ id, creadaEn: _creadaEn, ...resto }) => [id, resto])),
      celdas: Object.fromEntries(celdas.map((c) => [c.nombre, c.urlApp])),
    };
  }
}
