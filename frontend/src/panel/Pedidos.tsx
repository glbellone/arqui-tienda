import { useEffect, useState } from 'react';
import { aProblema, tiendaActual, type EstadoPedido, type Pedido } from '../api';
import EstadoVacio from '../componentes/EstadoVacio';
import { formatearMonto } from '../formato';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import EnlaceTienda from './EnlaceTienda';
import type { ContextoPanel } from './Panel';

const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  RECHAZADO: 'Pago rechazado',
};

/** Pedidos de la tienda: compras de los clientes y el estado de su pago (ADR-007). */
export default function Pedidos({ tienda }: ContextoPanel) {
  useTitulo(`Pedidos · ${tienda.nombre}`);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setPedidos(null);
    setError(null);
    tiendaActual
      .pedidos()
      .then((datos) => !cancelado && setPedidos(datos))
      .catch((err) => !cancelado && setError(aProblema(err).detail));
    return () => {
      cancelado = true;
    };

  }, [tienda.id]);

  return (
    <>
      <EncabezadoPagina titulo="Pedidos" descripcion="Las compras que hacen tus clientes." />
      <div className="tarjeta">
        {error && <p role="alert">{error}</p>}

        {!error && pedidos === null && <p className="texto-suave">Cargando pedidos…</p>}

        {pedidos !== null && pedidos.length === 0 && (
          <>
            <EstadoVacio icono="pedidos" titulo="Todavía no recibiste pedidos">
              Cuando un cliente compre en tu tienda, vas a ver acá el detalle y el estado del pago.
            </EstadoVacio>
            <div className="centrado">
              <EnlaceTienda url={tienda.url} />
            </div>
          </>
        )}

        {pedidos !== null && pedidos.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>

              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.creadoEn).toLocaleString('es-AR')}</td>
                  <td>{p.items.map((i) => `${i.nombre} ×${i.cantidad}`).join(', ')}</td>
                  <td>{formatearMonto(p.total.monto, p.total.moneda)}</td>
                  <td>{ETIQUETA_ESTADO[p.estado]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}