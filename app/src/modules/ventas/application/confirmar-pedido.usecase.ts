import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PASARELA_PAGOS } from '../../pagos/domain/pasarela-pagos.port';
import type { PasarelaPagos } from '../../pagos/domain/pasarela-pagos.port';
import { Pedido, PedidoRepository } from '../infrastructure/pedido.repository';

export interface ConfirmarPedidoCmd {
  tiendaId: string;
  claveIdempotencia: string;
  items: { productoId: string; cantidad: number }[];
}

@Injectable()
export class ConfirmarPedido {
  constructor(
    private readonly repo: PedidoRepository,
    @Inject(PASARELA_PAGOS) private readonly pagos: PasarelaPagos,
  ) {}

  async ejecutar(cmd: ConfirmarPedidoCmd): Promise<{ pedido: Pedido; creado: boolean }> {
    const huella = this.huellaDe(cmd.items);

    const { pedido, creado } = await this.repo.crearPendienteOExistente(cmd.tiendaId, {
      claveIdempotencia: cmd.claveIdempotencia,
      huella,
      items: cmd.items,
    });

    // Misma clave con otro carrito: es un error del cliente, no un reintento.
    if (pedido.huella !== huella) {
      throw new UnprocessableEntityException(
        'La Idempotency-Key ya se usó con un carrito distinto',
      );

    }

    // Ya resuelto (PAGADO o RECHAZADO): devolver tal cual, sin cobrar de nuevo.
    if (pedido.estado !== 'PENDIENTE') return { pedido, creado };

    // PENDIENTE: pedido nuevo, o un intento anterior que se cortó antes de cobrar.
    // Reintentar es seguro porque la pasarela deduplica por clave.
    const cobro = await this.pagos.cobrar({
      montoCentavos: pedido.totalCentavos,
      moneda: pedido.moneda,
      referencia: pedido.id,
      claveIdempotencia: pedido.id,
    });

    const actualizado = await this.repo.marcar(
      cmd.tiendaId,
      pedido.id,
      cobro.estado === 'aprobado' ? 'PAGADO' : 'RECHAZADO',
      cobro.idCobro,
    );
    return { pedido: { ...actualizado, items: pedido.items }, creado };
  }

  private huellaDe(items: { productoId: string; cantidad: number }[]): string {
    const consolidado = new Map<string, number>();
    for (const i of items) {
      consolidado.set(i.productoId, (consolidado.get(i.productoId) ?? 0) + i.cantidad);
    }
    const canonico = [...consolidado.entries()].sort(([a], [b]) => a.localeCompare(b));
    return createHash('sha256').update(JSON.stringify(canonico)).digest('hex');
  }
}

