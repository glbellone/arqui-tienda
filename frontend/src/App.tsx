import { NavLink, Route, Routes } from 'react-router-dom';
import { ingresar, salir, sesionActual, type Sesion } from './auth';
import Inicio from './paginas/Inicio';
import NoEncontrada from './paginas/NoEncontrada';
import Panel from './paginas/Panel';
import TiendaPagina from './paginas/Tienda';
import { buscarTienda } from './tiendas';

function describirSesion(sesion: Sesion): string {
  if (sesion.roles.includes('admin')) return 'Administración';
  if (sesion.roles.includes('duenio')) return `Administra ${buscarTienda(sesion.tiendaId)?.nombre ?? sesion.tiendaId}`;
  return 'Comprador';
}

export default function App() {
  const sesion = sesionActual();
  const esDuenio = sesion?.roles.includes('duenio');

  return (
    <div className="marco">
      <header className="barra">
        <NavLink to="/" className="marca">
          Vidriera
        </NavLink>
        <nav className="navegacion" aria-label="Principal">
          <NavLink to="/" end>
            Tiendas
          </NavLink>
          {esDuenio && <NavLink to="/panel">Mi panel</NavLink>}
        </nav>
        <div className="sesion">
          {sesion ? (
            <>
              <span className="sesion-quien">
                <strong>{sesion.nombre}</strong>
                <span>{describirSesion(sesion)}</span>
              </span>
              <button type="button" className="boton boton-secundario" onClick={salir}>
                Salir
              </button>
            </>
          ) : (
            <button type="button" className="boton" onClick={ingresar}>
              Ingresar
            </button>
          )}
        </div>
      </header>

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/tiendas/:tiendaId" element={<TiendaPagina sesion={sesion} />} />
          <Route path="/panel" element={<Panel sesion={sesion} />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>
    </div>
  );
}
