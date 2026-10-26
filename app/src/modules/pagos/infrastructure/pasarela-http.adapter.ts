import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PasarelaPagos, ResultadoCobro, SolicitudCobro } from '../domain/pasarela-pagos.port';

interface ChargeResponse {
  id: string;
  status: 'approved' | 'declined';
}

/**
 * Anti-Corruption Layer (ADR-007): traduce entre nuestro modelo (en castellano, en centavos)
 * y el de la pasarela externa (en inglés, en unidades). Cambiar de pasarela solo toca esta clase.
 */
@Injectable()
export class PasarelaHttpAdapter implements PasarelaPagos {
  private readonly baseUrl = process.env.PASARELA_URL ?? 'http://pasarela-mock:4000';

  async cobrar(solicitud: SolicitudCobro): Promise<ResultadoCobro> {
    const respuesta = await fetch(`${this.baseUrl}/v1/charges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': solicitud.claveIdempotencia },
      body: JSON.stringify({
        amount: solicitud.montoCentavos / 100,
        currency: solicitud.moneda,
        reference: solicitud.referencia,
      }),
    });
    if (!respuesta.ok) throw new ServiceUnavailableException('La pasarela de pagos no pudo procesar el cobro');

    const charge = (await respuesta.json()) as ChargeResponse;
    return { idCobro: charge.id, estado: charge.status === 'approved' ? 'aprobado' : 'rechazado' };
  }
}
