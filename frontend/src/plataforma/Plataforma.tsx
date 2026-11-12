import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { buscarTienda } from '../api';
import { ingresar, salir, sesionActual, type Sesion } from '../auth';
import Icono, { type NombreIcono } from '../componentes/Icono';
import { useTitulo } from '../hooks/useTitulo';
import Administracion from './admin/Administracion';
import { NOMBRE_PLATAFORMA } from './marca';

const BENEFICIOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: 'enlace',
    titulo: 'Tu propia dirección',
    texto: 'Tu tienda se publica en su propio subdominio, listo para compartir con tus clientes.',
  },
  {
    icono: 'candado',
    titulo: 'Solo tu tienda',
    texto: 'Tus clientes ven tus productos y nada más: no hay un listado compartido con otras tiendas.',
  },
  {
    icono: 'grafico',
    titulo: 'Crece con vos',
    texto: 'Con el plan Premium tu tienda tiene infraestructura y datos dedicados.',
  },
];

/** Sitio de la plataforma (sin subdominio): la presentación para emprendedores y la administración, en /admin. */
export default function Plataforma() {
  const sesion = useMemo(() => sesionActual(), []);

  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <div className="sitio-plataforma sitio-admin">
            <Administracion sesion={sesion} />
          </div>
        }
      />
      <Route
        path="*"
        element={
          <div className="sitio-plataforma">
            <BarraPlataforma sesion={sesion} />
            <Routes>
              <Route path="/" element={<Presentacion sesion={sesion} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <footer className="plataforma-pie">
              © {new Date().getFullYear()} {NOMBRE_PLATAFORMA}
            </footer>
          </div>
        }
      />
    </Routes>
  );
}

function BarraPlataforma({ sesion }: { sesion: Sesion | null }) {
  const esAdmin = !!sesion?.roles.includes('admin');

  return (
    <header className="plataforma-barra">
      <Link to="/" className="plataforma-marca">
        <Icono nombre="tienda" medida={22} />
        {NOMBRE_PLATAFORMA}
      </Link>
      <div className="plataforma-sesion">
        {esAdmin && (
          <NavLink to="/admin" className="plataforma-enlace">
            <Icono nombre="grafico" medida={18} />
            Administración
          </NavLink>
        )}
        {sesion ? (
          <>
            <span className="texto-suave ocultar-en-movil">{sesion.nombre}</span>
            <button type="button" className="boton boton-secundario boton-chico" onClick={() => salir()}>
              Salir
            </button>
          </>
        ) : (
          <button type="button" className="boton boton-secundario boton-chico" onClick={() => ingresar()}>
            Ingresar
          </button>
        )}
      </div>
    </header>
  );
}

/** Presentación para emprendedores. A propósito no lista tiendas. */
function Presentacion({ sesion }: { sesion: Sesion | null }) {
  useTitulo(NOMBRE_PLATAFORMA);
  const [urlPanel, setUrlPanel] = useState<string | null>(null);

  // Si ingresa un dueño, se le ofrece ir al panel de su tienda.
  useEffect(() => {
    if (!sesion?.roles.includes('duenio') || !sesion.tiendaId) return;
    buscarTienda(sesion.tiendaId)
      .then((tienda) => setUrlPanel(`${tienda.url}/panel`))
      .catch(() => setUrlPanel(null));
  }, [sesion]);

  return (
    <main>
      <section className="plataforma-portada">
        <p className="plataforma-antetitulo">Para emprendedores</p>
        <h1>Tu tienda online, con tu propia dirección</h1>
        <p className="plataforma-bajada">Cargá tus productos, compartí tu enlace y vendé.</p>
        {urlPanel ? (
          <a href={urlPanel} className="boton boton-grande">
            Ir al panel de mi tienda
            <Icono nombre="derecha" medida={18} />
          </a>
        ) : (
          !sesion && (
            <button type="button" className="boton boton-grande" onClick={() => ingresar()}>
              Ingresar a mi tienda
            </button>
          )
        )}
      </section>

      <section className="plataforma-beneficios" aria-label="Beneficios">
        {BENEFICIOS.map((b) => (
          <article key={b.titulo} className="tarjeta">
            <span className="metrica-icono">
              <Icono nombre={b.icono} medida={20} />
            </span>
            <h2>{b.titulo}</h2>
            <p>{b.texto}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
