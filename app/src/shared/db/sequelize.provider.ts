import { Sequelize } from 'sequelize';

export const SEQUELIZE = Symbol('SEQUELIZE');

const entero = (nombre: string, porDefecto: number): number => {
  const valor = Number(process.env[nombre] ?? porDefecto);
  return Number.isInteger(valor) && valor > 0 ? valor : porDefecto;
};

/**
 * Crea la conexión de la celda. Cada celda apunta a su propia base con DB_URL:
 * el código no sabe si es pool o Premium. Si falta DB_URL, la app no arranca.
 */
export function crearSequelize(): Sequelize {
  const url = process.env.DB_URL;
  if (!url) throw new Error('Falta la variable de entorno DB_URL');

  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: entero('DB_POOL_MAX', 10),
      idle: entero('DB_POOL_IDLE_MS', 10_000),
      acquire: entero('DB_POOL_ACQUIRE_MS', 10_000),
    },
    // El esquema lo manda el SQL de las migraciones, no los modelos.
    define: { underscored: true, timestamps: false },
  });
}
