import { Link } from 'react-router-dom';
import type { Tienda } from '../api';
import { esDuenioDe, ingresar, salir, type Sesion } from '../auth';
import Monograma from '../componentes/Monograma';
import { useCarrito } from './carrito';

interface Props {
  tienda: Tienda;
  sesion: Sesion | null;
}

export default function PieTienda({ tienda, sesion }: Props) {
  const carrito = useCarrito();
  const anio = new Date().getFullYear();

  return (
    <footer className="pie-tienda">
      <div className="pie-tienda-contenido">
        <div className="pie-tienda-marca">
          <Monograma nombre={tienda.nombre} />
          <div>
            <strong>{tienda.nombre}</strong>
            <span>{tienda.rubro}</span>
          </div>
        </div>

        <nav className="pie-tienda-columnas" aria-label="Pie de página">
          <div>
            <h2>Tienda</h2>
            <Link to="/">Inicio</Link>
            <Link to={{ pathname: '/', hash: '#productos' }}>Productos</Link>
            <button type="button" onClick={carrito.abrir}>
              Carrito
            </button>
          </div>
          <div>
            <h2>Tu cuenta</h2>
            {sesion ? (
              <>
                {esDuenioDe(sesion, tienda.id) && <Link to="/panel">Administrar tienda</Link>}
                <button type="button" onClick={() => salir()}>
                  Salir
                </button>
              </>
            ) : (
              <button type="button" onClick={() => ingresar()}>
                Ingresar
              </button>
            )}
          </div>
        </nav>
      </div>
      <p className="pie-tienda-legal">
        © {anio} {tienda.nombre}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
