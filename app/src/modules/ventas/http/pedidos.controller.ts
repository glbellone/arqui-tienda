import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../../../shared/auth/auth.guard';
import { Roles } from '../../../shared/auth/roles.decorator';
import { UsuarioActual, type Usuario } from '../../../shared/auth/usuario';
import { ConfirmarPedido } from '../application/confirmar-pedido';
import { ListarPedidos } from '../application/listar-pedidos';
import type { Pedido } from '../domain/pedido';
import { ConfirmarPedidoDto } from './confirmar-pedido.dto';

const aDto = (p: Pedido) => ({
  id: p.id,
  tiendaId: p.tiendaId,
  estado: p.estado,
  totalCentavos: p.totalCentavos,
  moneda: p.moneda,
  pagoReferencia: p.pagoReferencia,
  comprador: p.comprador,
  envio: p.envio,
  creadoEn: p.creadoEn,
  items: p.lineas,
});

@Controller('v1/tiendas/:tiendaId/pedidos')
export class PedidosController {
  constructor(
    private readonly confirmarPedido: ConfirmarPedido,
    private readonly listarPedidos: ListarPedidos,
  ) {}

  /** Público: para comprar no hace falta tener cuenta. 201 si el pedido es nuevo, 200 si es un reintento. */
  @Post()
  async confirmar(
    @Param('tiendaId') tiendaId: string,
    @Headers('idempotency-key') clave: string | undefined,
    @Body() dto: ConfirmarPedidoDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!clave) throw new BadRequestException('Falta el header Idempotency-Key');
    if (clave.length > 200) throw new BadRequestException('El header Idempotency-Key es demasiado largo');

    const { pedido, creado } = await this.confirmarPedido.ejecutar({
      tiendaId,
      claveIdempotencia: clave,
      items: dto.items,
      comprador: dto.comprador,
      envio: dto.envio,
    });
    res.status(creado ? 201 : 200);
    return aDto(pedido);
  }

  /**
   * Requiere el rol duenio. Que sea el dueño de ESTA tienda lo controla el caso de uso
   * (regla de aislamiento): el controller solo traduce HTTP a una consulta.
   */
  @Get()
  @UseGuards(AuthGuard)
  @Roles('duenio')
  async listar(@Param('tiendaId') tiendaId: string, @UsuarioActual() usuario: Usuario) {
    const pedidos = await this.listarPedidos.ejecutar({ tiendaId, solicitante: usuario });
    return pedidos.map(aDto);
  }
}
