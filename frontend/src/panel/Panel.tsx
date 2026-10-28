import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { tiendaActual, type Producto, type Tienda } from '../api';
import { esDuenioDe, ingresar, salir, type Sesion } from '../auth';
import Icono, { type NombreIcono } from '../componentes/Icono';
import MenuDesplegable from '../componentes/MenuDesplegable';
import Monograma from '../componentes/Monograma';
import { iniciales } from '../formato';
import { useCarga, type Carga } from '../hooks/useCarga';
import MiTienda from './MiTienda';
import NuevoProducto from './NuevoProducto';
import Pedidos from './Pedidos';
import Productos from './Productos';
import Resumen from './Resumen';

interface Props {
  tienda: Tienda;
  sesion: Sesion | null;
}

/** Lo que comparten todas las páginas del panel. */
export interface ContextoPanel {
  tienda: Tienda;
  sesion: Sesion;
  productos: Carga<Producto[]>;
  recargarProductos: () => void;
}

const SECCIONES: { ruta: string; etiqueta: string; icono: NombreIcono; exacta?: boolean }[] = [
  { ruta: '/panel', etiqueta: 'Inicio', icono: 'inicio', exacta: true },
  { ruta: '/panel/productos', etiqueta: 'Productos', icono: 'paquete' },
  { ruta: '/panel/pedidos', etiqueta: 'Pedidos', icono: 'pedidos' },
  { ruta: '/panel/tienda', etiqueta: 'Mi tienda', icono: 'tienda' },
];

/**
 * Panel del dueño, en /panel de su tienda. Ocultar el botón del panel no alcanza: si otro usuario
 * entra directo acá, se lo frena, y la API igual rechaza cualquier carga (403).
 */
export default function Panel({ tienda, sesion }: Props) {
  if (!sesion) return <IngresoPanel tienda={tienda} />;
  if (!esDuenioDe(sesion, tienda.id)) return <SinAcceso tienda={tienda} sesion={sesion} />;
  return <LayoutPanel tienda={tienda} sesion={sesion} />;
}

function LayoutPanel({ tienda, sesion }: { tienda: Tienda; sesion: Sesion }) {
  const [productos, recargarProductos] = useCarga(() => tiendaActual.productos(), []);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();
  const contexto: ContextoPanel = { tienda, sesion, productos, recargarProductos };

  // En el celular, el menú se cierra al navegar.
  useEffect(() => {
    setMenuAbierto(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`panel ${menuAbierto ? 'panel-menu-abierto' : ''}`}>
      <aside className="panel-lateral" aria-label="Menú del panel">
        <div className="panel-lateral-tienda">
          <Monograma nombre={tienda.nombre} />
          <div>
            <strong>{tienda.nombre}</strong>
            {tienda.plan === 'Premium' ? (
              <span className="insignia insignia-premium">
                <Icono nombre="corona" medida={13} />
                Premium
              </span>
            ) : (
              <span className="panel-lateral-rubro">{tienda.rubro}</span>
            )}
          </div>
        </div>

        <nav className="panel-navegacion">
          {SECCIONES.map((s) => (
            <NavLink key={s.ruta} to={s.ruta} end={s.exacta} className="panel-navegacion-item">
              <Icono nombre={s.icono} medida={19} />
              {s.etiqueta}
            </NavLink>
          ))}
          <hr />
          <a href="/" target="_blank" rel="noreferrer" className="panel-navegacion-item">
            <Icono nombre="externo" medida={19} />
            Ver mi tienda
          </a>
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
          <span className="panel-barra-tienda">{tienda.nombre}</span>
          <div className="panel-barra-acciones">
            {!pathname.startsWith('/panel/productos') && (
              <Link to="/panel/productos/nuevo" className="boton boton-chico">
                <Icono nombre="mas" medida={16} />
                <span className="ocultar-en-movil">Nuevo producto</span>
              </Link>
            )}
            <MenuDesplegable
              etiqueta="Tu cuenta"
              claseDisparador="boton-cuenta"
              disparador={
                <>
                  <span className="avatar">{iniciales(sesion.nombre)}</span>
                  <Icono nombre="abajo" medida={16} />
                </>
              }
            >
              {(cerrar) => (
                <>
                  <div className="menu-encabezado">
                    <strong>{sesion.nombre}</strong>
                    <span>{sesion.usuario}</span>
                  </div>
                  <Link to="/" className="menu-item" role="menuitem" onClick={cerrar}>
                    <Icono nombre="tienda" medida={18} />
                    Ir a la tienda
                  </Link>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => salir()}>
                    <Icono nombre="salir" medida={18} />
                    Salir
                  </button>
                </>
              )}
            </MenuDesplegable>
          </div>
        </header>

        <main className="panel-contenido">
          <Routes>
            <Route index element={<Resumen {...contexto} />} />
            <Route path="productos" element={<Productos {...contexto} />} />
            <Route path="productos/nuevo" element={<NuevoProducto {...contexto} />} />
            <Route path="pedidos" element={<Pedidos {...contexto} />} />
            <Route path="tienda" element={<MiTienda {...contexto} />} />
            <Route path="*" element={<Navigate to="/panel" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function IngresoPanel({ tienda }: { tienda: Tienda }) {
  return (
    <main className="pantalla-acceso">
      <div className="tarjeta tarjeta-acceso">
        <Monograma nombre={tienda.nombre} medida="grande" />
        <h1>Administrá {tienda.nombre}</h1>
        <p>Ingresá con la cuenta de la tienda para gestionar tus productos y pedidos.</p>
        <button type="button" className="boton boton-grande boton-bloque" onClick={() => ingresar('/panel')}>
          Ingresar
        </button>
        <Link to="/" className="enlace-suave">
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}

function SinAcceso({ tienda, sesion }: { tienda: Tienda; sesion: Sesion }) {
  return (
    <main className="pantalla-acceso">
      <div className="tarjeta tarjeta-acceso">
        <span className="estado-vacio-icono">
          <Icono nombre="candado" medida={28} />
        </span>
        <h1>No tenés acceso a este panel</h1>
        <p>
          Ingresaste como <strong>{sesion.usuario}</strong>, que no administra {tienda.nombre}.
        </p>
        <button type="button" className="boton boton-grande boton-bloque" onClick={() => salir('/panel')}>
          Ingresar con otra cuenta
        </button>
        <Link to="/" className="enlace-suave">
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
