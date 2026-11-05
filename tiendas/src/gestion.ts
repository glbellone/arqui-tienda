import { borrarDatosDeTienda } from './celdas-db';
import { ErrorDeNegocio } from './http';
import type { Keycloak } from './keycloak';
import type { Registro, Tienda } from './registro';

export interface NuevaTienda {
  nombre: string;
  subdominio: string;
  rubro: string;
  color: string;
  duenio: { nombre: string; email: string };
}

const SUBDOMINIO = /^[a-z0-9](-?[a-z0-9])*$/;
const RESERVADOS = new Set(['www', 'api', 'admin', 'panel', 'app']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const COLORES = ['#C98A12', '#24806F', '#6D3FD0', '#C2410C', '#1D4ED8', '#BE185D', '#4D7C0F'];

const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : '');

/** Valida el cuerpo del alta. Junta todos los problemas en un solo mensaje. */
export function leerNuevaTienda(cuerpo: unknown): NuevaTienda {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  const d = (c.duenio ?? {}) as Record<string, unknown>;
  const datos: NuevaTienda = {
    nombre: texto(c.nombre),
    subdominio: texto(c.subdominio).toLowerCase(),
    rubro: texto(c.rubro),
    color: texto(c.color) || COLORES[Math.floor(Math.random() * COLORES.length)],
    duenio: { nombre: texto(d.nombre), email: texto(d.email).toLowerCase() },
  };

  const errores: string[] = [];
  if (!datos.nombre || datos.nombre.length > 80) errores.push('El nombre de la tienda es obligatorio (hasta 80 caracteres)');
  if (datos.subdominio.length < 3 || datos.subdominio.length > 40 || !SUBDOMINIO.test(datos.subdominio)) {
    errores.push('El subdominio tiene que tener entre 3 y 40 letras minúsculas, números o guiones');
  } else if (RESERVADOS.has(datos.subdominio)) {
    errores.push(`El subdominio ${datos.subdominio} está reservado`);
  }
  if (!datos.rubro || datos.rubro.length > 80) errores.push('El rubro es obligatorio (hasta 80 caracteres)');
  if (!COLOR.test(datos.color)) errores.push('El color tiene que tener el formato #RRGGBB');
  if (!datos.duenio.nombre || datos.duenio.nombre.length > 80) errores.push('El nombre del dueño es obligatorio');
  if (!EMAIL.test(datos.duenio.email)) errores.push('El email del dueño no es válido');
  if (errores.length) throw new ErrorDeNegocio(400, errores.join('; '));
  return datos;
}

/**
 * Alta y baja de tiendas (ADR-012). Coordina el registro, la base de la celda y Keycloak. No hay una
 * transacción que abarque los tres: si un paso falla, se deshacen los anteriores (compensación).
 */
export class GestionDeTiendas {
  constructor(
    private readonly registro: Registro,
    private readonly keycloak: Keycloak,
  ) {}

  /** Toda tienda nueva empieza en la celda pool, con plan Estándar. */
  async crear(datos: NuevaTienda): Promise<{ tienda: Tienda; duenio: { usuario: string; clave: string } }> {
    const id = await this.registro.proximoId();
    const pool = await this.registro.celdaPool();
    try {
      await this.registro.agregarTienda({ id, ...datos, plan: 'Estándar', celda: pool.nombre });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ErrorDeNegocio(409, `El subdominio ${datos.subdominio} ya lo usa otra tienda`);
      }
      throw error;
    }

    try {
      await this.keycloak.permitirSitio(datos.subdominio);
      const duenio = await this.keycloak.crearDuenio({ ...datos.duenio, tiendaId: id });
      return { tienda: (await this.registro.tienda(id))!, duenio };
    } catch (error) {
      // Compensación: si no se pudo crear el dueño, la tienda no queda a medias.
      await this.registro.borrarTienda(id).catch(console.error);
      await this.keycloak.quitarSitio(datos.subdominio).catch(console.error);
      throw error;
    }
  }

  async darDeBaja(id: string): Promise<void> {
    const tienda = await this.registro.tienda(id);
    if (!tienda) throw new ErrorDeNegocio(404, `La tienda ${id} no existe`);
    if (tienda.estado !== 'activa') throw new ErrorDeNegocio(409, 'La tienda se está mudando de celda: probá cuando termine');
    const celda = await this.registro.celda(tienda.celda);

    // 1. Sale del registro: a los pocos segundos el gateway deja de rutearla.
    await this.registro.borrarTienda(id);
    // 2. Sus datos se borran de su celda. 3. Su dueño ya no puede ingresar.
    if (celda) await borrarDatosDeTienda(celda.hostDb, id);
    await this.keycloak.eliminarDuenios(id);
    await this.keycloak.quitarSitio(tienda.subdominio);
  }
}
