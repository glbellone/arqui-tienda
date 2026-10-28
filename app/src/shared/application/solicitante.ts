/**
 * Quién pide ejecutar un caso de uso. La capa de aplicación lo recibe sin saber de dónde salió:
 * hoy lo arma el AuthGuard a partir del token OIDC (ADR-005), pero podría venir de cualquier otro lado.
 */
export interface Solicitante {
  roles: string[];
  /** Solo los dueños tienen tienda: la que administran (claim tienda_id). */
  tiendaId?: string;
}
