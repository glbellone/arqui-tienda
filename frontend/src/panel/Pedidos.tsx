import { useEffect } from 'react';
import type { EstadoPedido } from '../api';
import AvisoError from '../componentes/AvisoError';
import { Esqueleto } from '../componentes/Esqueleto';
import EstadoVacio from '../componentes/EstadoVacio';
import { formatearPrecio, plural } from '../formato';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import EnlaceTienda from './EnlaceTienda';
import type { ContextoPanel } from './Panel';

const ESTADOS: Record<EstadoPedido, { texto: string; clase: string }> = {
  PENDIENTE: { texto: 'Pendiente', clase: '' },
  PAGADO: { texto: 'Pagado', clase: 'insignia-exito' },
  RECHAZADO: { texto: 'Pago rechazado', clase: 'insignia-error' },
};

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/** Pedidos de la tienda: las compras de los clientes y el estado de su pago (ADR-007). */
export default function Pedidos({ tienda, pedidos, recargarPedidos }: ContextoPanel) {
  useTitulo(`Pedidos · ${tienda.nombre}`);

  // Cada vez que se entra, se piden de nuevo: puede haber compras desde la última vez.
  useEffect(recargarPedidos, [recargarPedidos]);

  const total = pedidos.estado === 'listo' ? pedidos.datos.length : 0;

  return (
    <>
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion={total > 0 ? plural(total, 'pedido', 'pedidos') : 'Las compras que hacen tus clientes.'}
      />

      {pedidos.estado === 'error' && <AvisoError problema={pedidos.problema} onReintentar={recargarPedidos} />}

      {pedidos.estado === 'listo' && total === 0 ? (
        <div className="tarjeta">
          <EstadoVacio icono="pedidos" titulo="Todavía no recibiste pedidos">
            Cuando un cliente compre en tu tienda, vas a ver acá el detalle y el estado del pago.
          </EstadoVacio>
          <div className="centrado">
            <EnlaceTienda url={tienda.url} />
          </div>
        </div>
      ) : (
        <div className="tarjeta tarjeta-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Productos</th>
                <th scope="col" className="alinear-derecha">
                  Total
                </th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.estado === 'cargando' &&
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={4}>
                      <Esqueleto className="esqueleto-linea" />
                    </td>
                  </tr>
                ))}
              {pedidos.estado === 'listo' &&
                pedidos.datos.map((p) => (
                  <tr key={p.id}>
                    <td className="texto-suave">{fecha.format(new Date(p.creadoEn))}</td>
                    <td>{p.items.map((i) => `${i.nombre} ×${i.cantidad}`).join(', ')}</td>
                    <td className="alinear-derecha">{formatearPrecio(p.total)}</td>
                    <td>
                      <span className={`insignia ${ESTADOS[p.estado].clase}`}>{ESTADOS[p.estado].texto}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
