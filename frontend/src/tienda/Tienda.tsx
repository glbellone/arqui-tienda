import type { CSSProperties } from 'react';
import { Route, Routes } from 'react-router-dom';
import { tiendaActual } from '../api';
import { sesionActual } from '../auth';
import AvisoError from '../componentes/AvisoError';
import { Esqueleto } from '../componentes/Esqueleto';
import { useCarga } from '../hooks/useCarga';
import Panel from '../panel/Panel';
import Checkout from './Checkout';
import DetalleProducto from './DetalleProducto';
import LayoutTienda from './LayoutTienda';
import NoEncontrada from './NoEncontrada';
import Portada from './Portada';

/**
 * Sitio de una tienda, en su subdominio (ADR-011): la vitrina para los compradores y el panel
 * del dueño en /panel. El color de la tienda tiñe toda la interfaz.
 */
export default function Tienda() {
  const sesion = sesionActual();
  const [carga, recargar] = useCarga(() => tiendaActual.datos(), []);

  if (carga.estado === 'cargando') {
    return (
      <div className="pantalla-carga" aria-busy="true" aria-label="Cargando la tienda">
        <div className="pantalla-carga-barra">
          <Esqueleto className="esqueleto-logo" />
          <Esqueleto className="esqueleto-linea esqueleto-corta" />
        </div>
        <Esqueleto className="esqueleto-portada" />
      </div>
    );
  }

  if (carga.estado === 'error') {
    const noExiste = carga.problema.status === 404;
    return (
      <main className="pagina-mensaje">
        <h1>{noExiste ? 'Esta tienda no existe' : 'No pudimos abrir la tienda'}</h1>
        <p>{noExiste ? 'Revisá la dirección e intentá de nuevo.' : 'Estamos teniendo un problema. Probá de nuevo en unos minutos.'}</p>
        {!noExiste && <AvisoError problema={carga.problema} onReintentar={recargar} />}
      </main>
    );
  }

  const tienda = carga.datos;
  return (
    <div className="sitio-tienda" style={{ '--tienda': tienda.color } as CSSProperties}>
      <Routes>
        <Route path="/panel/*" element={<Panel tienda={tienda} sesion={sesion} />} />
        <Route element={<LayoutTienda tienda={tienda} sesion={sesion} />}>
          <Route index element={<Portada tienda={tienda} sesion={sesion} />} />
          <Route path="productos/:productoId" element={<DetalleProducto tienda={tienda} />} />
          <Route path="checkout" element={<Checkout tienda={tienda} />} />
          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Routes>
    </div>
  );
}
