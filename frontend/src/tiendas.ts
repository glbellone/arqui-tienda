export interface Tienda {
  id: string;
  nombre: string;
  rubro: string;
  plan: 'Estándar' | 'Premium';
  /** Color de identidad de la tienda en la vitrina. */
  color: string;
}

/**
 * Catálogo fijo de tiendas de prueba. Coincide con gateway/registro-tiendas.json
 * y con los usuarios de Keycloak. Cuando exista el módulo Tiendas, esto sale de la API.
 */
export const TIENDAS: Tienda[] = [
  { id: 't1', nombre: 'La Yerbera', rubro: 'Yerbas, mates y bombillas', plan: 'Estándar', color: '#C98A12' },
  { id: 't2', nombre: 'Cerámica Ñandú', rubro: 'Vajilla hecha a mano', plan: 'Estándar', color: '#24806F' },
  { id: 'p1', nombre: 'Sastrería Ombú', rubro: 'Indumentaria a medida', plan: 'Premium', color: '#6D3FD0' },
];

export const buscarTienda = (id?: string) => TIENDAS.find((t) => t.id === id);
