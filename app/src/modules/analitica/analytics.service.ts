import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject('ANALYTICS_SERVICE') private readonly client: ClientProxy,
  ) {}

  // Método para reportar cuando se confirma un pedido
  async emitirPedidoConfirmado(datosPedido: { tiendaId: string; pedidoId: string; total: number }) {
    this.client.emit('pedido_confirmado', {
      celda: process.env.CELDA || 'pool', // Identifica si vino de 'pool' o 'premium-a'
      ...datosPedido,
      timestamp: new Date(),
    });
  }

  // Método para reportar cuando se crea un producto
  async emitirProductoCreado(datosProducto: { tiendaId: string; productoId: string; nombre: string }) {
    this.client.emit('producto_creado', {
      celda: process.env.CELDA || 'pool',
      ...datosProducto,
      timestamp: new Date(),
    });
  }
}