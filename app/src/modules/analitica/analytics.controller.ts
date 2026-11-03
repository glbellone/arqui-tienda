import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AnaliticaProcesadorService } from './analitica-procesador.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly procesadorService: AnaliticaProcesadorService) {}

  @EventPattern('pedido_confirmado')
  async handlePedidoConfirmado(@Payload() data: any) {
    console.log(' [Analítica] Evento recibido -> pedido_confirmado:', data);
    const { tiendaId, total } = data;
    if (tiendaId) {
      const montoCentavos = total || 0;
      await this.procesadorService.registrarPedidoConfirmado(tiendaId, montoCentavos);
    }
  }

  @EventPattern('producto_creado')
  async handleProductoCreado(@Payload() data: any) {
    console.log(' [Analítica] Evento recibido -> producto_creado:', data);
    const { tiendaId } = data;
    if (tiendaId) {
      await this.procesadorService.registrarProductoCreado(tiendaId);
    }
  }

  @Get('/v1/admin/analitica/totales-por-tienda')
  async obtenerTotales() {
    return await this.procesadorService.obtenerTotales();
  }
}