import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ingresar, salir, type Sesion } from '../../auth';
import Icono, { type NombreIcono } from '../../componentes/Icono';
import Monograma from '../../componentes/Monograma';
import { iniciales } from '../../formato';
import { NOMBRE_PLATAFORMA } from '../marca';
import Estadisticas from './Estadisticas';
import NuevaTienda from './NuevaTienda';
import Tiendas from './Tiendas';

/** Las gestiones del administrador, en el menú lateral. */
const SECCIONES: { ruta: string; etiqueta: string; icono: NombreIcono }[] = [
  { ruta: '/admin/tiendas', etiqueta: 'Tiendas', icono: 'tienda' },
  { ruta: '/admin/estadisticas', etiqueta: 'Estadísticas', icono: 'grafico' },
];

/** Administración de la plataforma, en /admin. Solo para el rol admin. */
export default function Administracion({ sesion }: { sesion: Sesion | null }) {
  if (!sesion) return <IngresoAdmin />;
  if (!sesion.roles.includes('admin')) return <SinAcceso sesion={sesion} />;
  return <LayoutAdmin sesion={sesion} />;
}

function LayoutAdmin({ sesion }: { sesion: Sesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();

  // En el celular, el menú se cierra al navegar.
  useEffect(() => {
    setMenuAbierto(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`panel ${menuAbierto ? 'panel-menu-abierto' : ''}`}>
      <aside className="panel-lateral" aria-label="Menú de administración">
        <div className="panel-lateral-tienda">
          <Monograma nombre={NOMBRE_PLATAFORMA} />
          <div>
            <strong>{NOMBRE_PLATAFORMA}</strong>
            <span className="panel-lateral-rubro">Administración</span>
          </div>
        </div>

        <nav className="panel-navegacion">
          {SECCIONES.map((s) => (
            <NavLink key={s.ruta} to={s.ruta} className="panel-navegacion-item">
              <Icono nombre={s.icono} medida={19} />
              {s.etiqueta}
            </NavLink>
          ))}
          <hr />
          <Link to="/" className="panel-navegacion-item">
            <Icono nombre="inicio" medida={19} />
            Portada
          </Link>
        </nav>

        <div className="panel-lateral-usuario">
          <span className="avatar">{iniciales(sesion.nombre)}</span>
          <div>
            <strong>{sesion.nombre}</strong>
            <span>{sesion.usuario}</span>
          </div>
          <button type="button" className="boton-icono" onClick={() => salir()} aria-label="Salir" title="Salir">
            <Icono nombre="salir" medida={18} />
          </button>
        </div>
      </aside>
      <div className="panel-fondo-menu" onClick={() => setMenuAbierto(false)} aria-hidden="true" />

      <div className="panel-principal">
        <header className="panel-barra">
          <button
            type="button"
            className="boton-icono panel-boton-menu"
            onClick={() => setMenuAbierto((a) => !a)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
          >
            <Icono nombre="menu" />
          </button>
          <span className="panel-barra-tienda">Administración</span>
          <div className="panel-barra-acciones">
            {/* En Tiendas el botón ya está en la página. */}
            {!pathname.startsWith('/admin/tiendas') && (
              <Link to="/admin/tiendas/nueva" className="boton boton-chico">
                <Icono nombre="mas" medida={16} />
                <span className="ocultar-en-movil">Nueva tienda</span>
              </Link>
            )}
          </div>
        </header>

        <main className="panel-contenido">
          <Routes>
            <Route index element={<Navigate to="/admin/tiendas" replace />} />
            <Route path="tiendas" element={<Tiendas />} />
            <Route path="tiendas/nueva" element={<NuevaTienda />} />
            <Route path="estadisticas" element={<Estadisticas />} />
            <Route path="*" element={<Navigate to="/admin/tiendas" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function IngresoAdmin() {
  const { pathname } = useLocation();
  return (
    <main className="pantalla-acceso">
      <div className="tarjeta tarjeta-acceso">
        <span className="estado-vacio-icono">
          <Icono nombre="candado" medida={28} />
        </span>
        <h1>Administración de la plataforma</h1>
        <p>Ingresá con una cuenta de administrador para gestionar las tiendas.</p>
        <button type="button" className="boton boton-grande boton-bloque" onClick={() => ingresar(pathname)}>
          Ingresar
        </button>
        <Link to="/" className="enlace-suave">
          Volver a la portada
        </Link>
      </div>
    </main>
  );
}

function SinAcceso({ sesion }: { sesion: Sesion }) {
  const { pathname } = useLocation();
  return (
    <main className="pantalla-acceso">
      <div className="tarjeta tarjeta-acceso">
        <span className="estado-vacio-icono">
          <Icono nombre="candado" medida={28} />
        </span>
        <h1>No tenés acceso a la administración</h1>
        <p>
          Ingresaste como <strong>{sesion.usuario}</strong>, que no es administrador de la plataforma.
        </p>
        <button type="button" className="boton boton-grande boton-bloque" onClick={() => salir(pathname)}>
          Ingresar con otra cuenta
        </button>
        <Link to="/" className="enlace-suave">
          Volver a la portada
        </Link>
      </div>
    </main>
  );
}
