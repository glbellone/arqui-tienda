import EstadoVacio from '../componentes/EstadoVacio';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import EnlaceTienda from './EnlaceTienda';
import type { ContextoPanel } from './Panel';

/** Pedidos de la tienda. Se van a completar con el módulo Ventas. */
export default function Pedidos({ tienda }: ContextoPanel) {
  useTitulo(`Pedidos · ${tienda.nombre}`);
  return (
    <>
      <EncabezadoPagina titulo="Pedidos" descripcion="Las compras que hacen tus clientes." />
      <div className="tarjeta">
        <EstadoVacio icono="pedidos" titulo="Todavía no recibiste pedidos">
          Cuando un cliente compre en tu tienda, vas a ver acá el detalle, el pago y el estado del envío.
        </EstadoVacio>
        <div className="centrado">
          <EnlaceTienda url={tienda.url} />
        </div>
      </div>
    </>
  );
}
