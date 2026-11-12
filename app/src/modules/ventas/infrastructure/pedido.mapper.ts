import type { InferCreationAttributes } from 'sequelize';
import { Pedido, type LineaPedido } from '../domain/pedido';
import type { PedidoItemModel, PedidoModel } from './pedido.model';

/** Traduce entre los modelos de Sequelize y el agregado del dominio. */
export const PedidoMapper = {
  aDominio(fila: PedidoModel): Pedido {
    return Pedido.reconstruir({
      id: fila.id,
      tiendaId: fila.tiendaId,
      claveIdempotencia: fila.claveIdempotencia,
      huella: fila.huella,
      estado: fila.estado,
      moneda: fila.moneda.trim(),
      pagoReferencia: fila.pagoReferencia,
      comprador: {
        nombre: fila.compradorNombre,
        email: fila.compradorEmail,
        ...(fila.compradorTelefono ? { telefono: fila.compradorTelefono } : {}),
      },
      envio: { direccion: fila.envioDireccion, ciudad: fila.envioCiudad, codigoPostal: fila.envioCodigoPostal },
      creadoEn: new Date(fila.creadoEn),
      lineas: (fila.lineas ?? []).map(aLinea),
    });
  },

  aFila(p: Pedido): InferCreationAttributes<PedidoModel> {
    return {
      id: p.id,
      tiendaId: p.tiendaId,
      claveIdempotencia: p.claveIdempotencia,
      huella: p.huella,
      estado: p.estado,
      totalCentavos: String(p.totalCentavos),
      moneda: p.moneda,
      pagoReferencia: p.pagoReferencia,
      compradorNombre: p.comprador.nombre,
      compradorEmail: p.comprador.email,
      compradorTelefono: p.comprador.telefono ?? null,
      envioDireccion: p.envio.direccion,
      envioCiudad: p.envio.ciudad,
      envioCodigoPostal: p.envio.codigoPostal,
      creadoEn: p.creadoEn,
    };
  },

  aFilasDeLineas(p: Pedido): InferCreationAttributes<PedidoItemModel>[] {
    return p.lineas.map((l) => ({
      pedidoId: p.id,
      tiendaId: p.tiendaId,
      productoId: l.productoId,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precioCentavos: String(l.precioCentavos),
    }));
  },
};

function aLinea(fila: PedidoItemModel): LineaPedido {
  return {
    productoId: fila.productoId,
    nombre: fila.nombre,
    cantidad: Number(fila.cantidad),
    precioCentavos: Number(fila.precioCentavos),
  };
}
