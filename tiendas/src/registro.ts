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

  async instantanea(): Promise<Instantanea> {
    const [tiendas, celdas] = await Promise.all([this.tiendas(), this.celdas()]);
    return {
      tiendas: Object.fromEntries(tiendas.map(({ id, creadaEn: _creadaEn, ...resto }) => [id, resto])),
      celdas: Object.fromEntries(celdas.map((c) => [c.nombre, c.urlApp])),
    };
  }
}
