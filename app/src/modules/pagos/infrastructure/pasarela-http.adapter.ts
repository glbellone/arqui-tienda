import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PasarelaPagos, ResultadoCobro, SolicitudCobro } from '../domain/pasarela-pagos.port';

interface ChargeResponse {
  id: string;
  status: 'approved' | 'declined';
}

/** Tiempo máximo de espera a la pasarela: si no responde, el pedido queda PENDIENTE y se puede reintentar. */
const TIMEOUT_MS = 5_000;

/**
 * Anti-Corruption Layer (ADR-007): traduce entre nuestro modelo (en castellano, en centavos)
 * y el de la pasarela externa (en inglés, en unidades). Cambiar de pasarela solo toca esta clase.
 */
@Injectable()
export class PasarelaHttpAdapter implements PasarelaPagos {
  private readonly baseUrl = process.env.PASARELA_URL ?? 'http://pasarela-mock:4000';

  async cobrar(solicitud: SolicitudCobro): Promise<ResultadoCobro> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.baseUrl}/v1/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': solicitud.claveIdempotencia },
        body: JSON.stringify({
          amount: solicitud.montoCentavos / 100,
          currency: solicitud.moneda,
          reference: solicitud.referencia,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Sin conexión o sin respuesta a tiempo: no sabemos si cobró. Reintentar con la misma clave es seguro.
      throw new ServiceUnavailableException('La pasarela de pagos no responde. Probá de nuevo en unos minutos.');
    }
    if (!respuesta.ok) throw new ServiceUnavailableException('La pasarela de pagos no pudo procesar el cobro');

    const charge = (await respuesta.json()) as ChargeResponse;
    return { idCobro: charge.id, estado: charge.status === 'approved' ? 'aprobado' : 'rechazado' };
  }
}