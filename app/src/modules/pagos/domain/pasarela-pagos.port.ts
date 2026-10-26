export const PASARELA_PAGOS = Symbol('PASARELA_PAGOS');

export interface SolicitudCobro {
  /** Referencia de nuestro dominio, por ejemplo el id del pedido. */
  referencia: string;
  montoCentavos: number;
  moneda: string;
  /** La misma clave en un reintento garantiza que no se cobre dos veces (ADR-007). */
  claveIdempotencia: string;
}

export interface ResultadoCobro {
  idCobro: string;
  estado: 'aprobado' | 'rechazado';
}

/** Puerto con nuestro vocabulario. El dominio nunca ve el modelo de la pasarela externa. */
export interface PasarelaPagos {
  cobrar(solicitud: SolicitudCobro): Promise<ResultadoCobro>;
}
