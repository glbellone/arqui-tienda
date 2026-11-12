export const PUBLICADOR_EVENTOS = Symbol('PUBLICADOR_EVENTOS');

/** Hechos de negocio que otros contextos pueden escuchar, por ejemplo Analítica (ADR-006). */
export type EventoDeNegocio =
  | { tipo: 'producto.creado'; tiendaId: string; productoId: string }
  | { tipo: 'pedido.confirmado'; tiendaId: string; pedidoId: string; montoCentavos: number };

/**
 * Puerto para publicar eventos. La capa de aplicación no sabe que existe RabbitMQ ni quién escucha.
 * Publicar nunca hace fallar ni demora el caso de uso: las estadísticas tienen consistencia eventual.
 */
export interface PublicadorDeEventos {
  publicar(evento: EventoDeNegocio): void;
}
