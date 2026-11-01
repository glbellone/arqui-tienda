import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class AnalyticsController {

  @EventPattern('pedido_confirmado')
  handlePedidoConfirmado(@Payload() data: any) {
    console.log(' [Analítica] Evento recibido -> pedido_confirmado:', data);
    
    // Aquí puedes procesar la información recibida:
    // data.celda -> te dirá si vino de 'pool' o 'premium-a'
    // data.tiendaId -> identificador de la tienda
    // data.total -> monto del pedido
    
    // TODO: Guardar o sumar estos datos en tu base de datos de analítica
  }

  @EventPattern('producto_creado')
  handleProductoCreado(@Payload() data: any) {
    console.log(' [Analítica] Evento recibido -> producto_creado:', data);
    
    // TODO: Actualizar el contador de productos de la tienda correspondiente
  }
}