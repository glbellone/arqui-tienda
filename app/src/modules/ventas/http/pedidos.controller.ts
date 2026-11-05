import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfirmarPedido } from '../application/confirmar-pedido.usecase';
import { PedidoRepository } from '../infrastructure/pedido.repository';
import { ConfirmarPedidoDto } from './confirmar-pedido.dto';

@Controller('v1/tiendas/:tiendaId/pedidos')
export class PedidosController {
  constructor(
    private readonly confirmarPedido: ConfirmarPedido,
    private readonly repo: PedidoRepository,
  ) {}

  @Post()
  async confirmar(
    @Param('tiendaId') tiendaId: string,
    @Headers('idempotency-key') clave: string | undefined,
    @Body() dto: ConfirmarPedidoDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!clave || clave.length > 200) {
      throw new BadRequestException('Falta el header Idempotency-Key');
    }

    const { pedido, creado } = await this.confirmarPedido.ejecutar({
      tiendaId,
      claveIdempotencia: clave,
      items: dto.items,
      comprador: dto.comprador,
      envio: dto.envio,
    });
    res.status(creado ? 201 : 200);
    return pedido;
  }

  // Solo el dueño de la tienda debería poder listar. Aplicá el mismo guard
  // que usás en el controller de productos.
  @Get()
  listar(@Param('tiendaId') tiendaId: string) {
    return this.repo.listar(tiendaId);
  }
}
