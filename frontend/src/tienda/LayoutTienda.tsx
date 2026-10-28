import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { Tienda } from '../api';
import type { Sesion } from '../auth';
import CajonCarrito from './CajonCarrito';
import { ProveedorCarrito } from './carrito';
import EncabezadoTienda from './EncabezadoTienda';
import PieTienda from './PieTienda';

interface Props {
  tienda: Tienda;
  sesion: Sesion | null;
}

/** Estructura común de las páginas de la tienda: encabezado, contenido, pie y carrito. */
export default function LayoutTienda({ tienda, sesion }: Props) {
  const { pathname, hash } = useLocation();

  // Al cambiar de página, volver arriba (salvo que se vaya a una sección con #).
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <ProveedorCarrito>
      <a href="#contenido" className="saltar-contenido">
        Saltar al contenido
      </a>
      <EncabezadoTienda tienda={tienda} sesion={sesion} />
      <main id="contenido" className="contenido-tienda">
        <Outlet />
      </main>
      <PieTienda tienda={tienda} sesion={sesion} />
      <CajonCarrito />
    </ProveedorCarrito>
  );
}
