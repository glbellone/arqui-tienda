import { useEffect, useState, type CSSProperties } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { aProblema, tiendaActual, type Problema, type Tienda as DatosTienda } from '../api';
import { esDuenioDe, sesionActual } from '../auth';
import AvisoError from '../componentes/AvisoError';
import Sesion from '../componentes/Sesion';
import Panel from './Panel';
import Vitrina from './Vitrina';

type Estado = { tipo: 'cargando' } | { tipo: 'lista'; tienda: DatosTienda } | { tipo: 'error'; problema: Problema };

/**
 * Sitio de una tienda, en su subdominio: la vitrina en / y el panel del dueño en /panel.
 * El botón del panel solo aparece si quien ingresó es el dueño de esta tienda.
 */
export default function Tienda() {
  const sesion = sesionActual();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    tiendaActual
      .datos()
      .then(({ datos }) => {
        document.title = datos.nombre;
        setEstado({ tipo: 'lista', tienda: datos });
      })
      .catch((error) => setEstado({ tipo: 'error', problema: aProblema(error) }));
  }, []);

  if (estado.tipo === 'cargando') {
    return (
      <main className="contenido">
        <p className="nota">Cargando la tienda…</p>
      </main>
    );
  }

  if (estado.tipo === 'error') {
    return (
      <main className="contenido">
        <h1 className="titulo">{estado.problema.status === 404 ? 'Esta tienda no existe' : 'No se pudo abrir la tienda'}</h1>
        <AvisoError problema={estado.problema} />
      </main>
    );
  }

  const { tienda } = estado;
  const esSuDuenio = esDuenioDe(sesion, tienda.id);

  return (
    <div className="marco" style={{ '--tienda': tienda.color } as CSSProperties}>
      <header className="barra">
        <Link to="/" className="marca">
          {tienda.nombre}
        </Link>
        <Sesion sesion={sesion}>
          {esSuDuenio && (
            <Link to="/panel" className="boton">
              Panel
            </Link>
          )}
        </Sesion>
      </header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Vitrina tienda={tienda} />} />
          <Route path="/panel" element={<Panel tienda={tienda} sesion={sesion} />} />
          <Route
            path="*"
            element={
              <section>
                <h1 className="titulo">Esta página no existe</h1>
                <p className="bajada">
                  <Link to="/">Volver a la tienda</Link>
                </p>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="pie">Tienda publicada con Vidriera</footer>
    </div>
  );
}
