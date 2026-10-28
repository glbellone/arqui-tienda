import { Link } from 'react-router-dom';
import EstadoVacio from '../componentes/EstadoVacio';

export default function NoEncontrada() {
  return (
    <div className="pagina-tienda">
      <EstadoVacio
        icono="buscar"
        titulo="No encontramos lo que buscabas"
        acciones={
          <Link to="/" className="boton">
            Ir al inicio
          </Link>
        }
      >
        Puede que el producto ya no esté disponible o que la dirección tenga un error.
      </EstadoVacio>
    </div>
  );
}
