import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import { ModelosPorTienda } from './modelos-por-tienda';

const ROL_DE_LA_APP = 'app_user';
const POLITICA = 'aislamiento_por_tienda';

/**
 * Crea el esquema de la celda con Sequelize al arrancar (idempotente).
 *
 * Usa una conexión de administración (DB_ADMIN_URL), distinta de la que usa la app en
 * ejecución: así app_user nunca tiene permisos para alterar el esquema ni salirse de RLS.
 * Tablas y tipos salen de los modelos (sync). Sequelize no tiene API para roles ni políticas,
 * por eso esas dos cosas se ejecutan como SQL a través de sequelize.query().
 */
@Injectable()
export class EsquemaInicializador implements OnApplicationBootstrap {
  private readonly log = new Logger(EsquemaInicializador.name);

  constructor(private readonly modelos: ModelosPorTienda) {}

  async onApplicationBootstrap(): Promise<void> {
    const url = process.env.DB_ADMIN_URL;
    if (!url) {
      this.log.warn('DB_ADMIN_URL no está definida: se asume que el esquema ya existe.');
      return;
    }

    const admin = new Sequelize(url, {
      dialect: 'postgres',
      logging: false,
      pool: { max: 1 },
      define: { underscored: true, timestamps: false },
    });

    try {
      await this.crearRolDeLaApp(admin);
      for (const definir of this.modelos.todos()) {
        const modelo = definir(admin);
        await modelo.sync(); // CREATE TABLE IF NOT EXISTS + índices, con los tipos del modelo
        await this.aislarPorTienda(admin, modelo.getTableName() as string, modelo);
        this.log.log(`Esquema listo: ${modelo.getTableName()}`);
      }
    } finally {
      await admin.close();
    }
  }

  /** La app se conecta con un usuario sin privilegios de dueño, para que RLS aplique siempre. */
  private async crearRolDeLaApp(admin: Sequelize): Promise<void> {
    const clave = admin.escape(process.env.APP_DB_PASSWORD ?? 'app_pass');
    await admin.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${ROL_DE_LA_APP}') THEN
          CREATE ROLE ${ROL_DE_LA_APP} LOGIN PASSWORD ${clave};
        END IF;
      END
      $$;
    `);
  }

  /** ADR-003: la base filtra por la tienda activa de la sesión, aunque el código se olvide del filtro. */
  private async aislarPorTienda(admin: Sequelize, tabla: string, modelo: { getAttributes(): object }) {
    const tieneTienda = Object.values(modelo.getAttributes()).some((a: { field?: string }) => a.field === 'tienda_id');
    if (!tieneTienda) throw new Error(`La tabla ${tabla} no tiene columna tienda_id: no se puede aislar por tienda`);

    const t = admin.getQueryInterface().quoteIdentifier(tabla);
    await admin.transaction(async (transaction) => {
      for (const sql of [
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ${t} TO ${ROL_DE_LA_APP}`,
        `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`,
        `DROP POLICY IF EXISTS ${POLITICA} ON ${t}`,
        `CREATE POLICY ${POLITICA} ON ${t}
           USING      (tienda_id = current_setting('app.tienda_id', true))
           WITH CHECK (tienda_id = current_setting('app.tienda_id', true))`,
      ]) {
        await admin.query(sql, { transaction });
      }
    });
  }
}
