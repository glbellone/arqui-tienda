import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Tienda } from '../api';
import { esDuenioDe, ingresar, salir, type Sesion } from '../auth';
import Icono from '../componentes/Icono';
import MenuDesplegable from '../componentes/MenuDesplegable';
import Monograma from '../componentes/Monograma';
import { iniciales } from '../formato';
import { useCarrito } from './carrito';

interface Props {
  tienda: Tienda;
  sesion: Sesion | null;
}

export default function EncabezadoTienda({ tienda, sesion }: Props) {
  const carrito = useCarrito();
  const esSuDuenio = esDuenioDe(sesion, tienda.id);

  return (
    <header className="encabezado-tienda">
      <div className="encabezado-tienda-contenido">
        <Link to="/" className="logo-tienda">
          <Monograma nombre={tienda.nombre} />
          <span className="logo-tienda-nombre">{tienda.nombre}</span>
        </Link>

        <Buscador />

        <div className="encabezado-acciones">
          {esSuDuenio && (
            <Link to="/panel" className="boton boton-secundario boton-chico ocultar-en-movil">
              <Icono nombre="tienda" medida={16} />
              Administrar tienda
            </Link>
          )}

          {sesion ? (
            <MenuDesplegable
              etiqueta="Tu cuenta"
              claseDisparador="boton-cuenta"
              disparador={
                <>
                  <span className="avatar">{iniciales(sesion.nombre)}</span>
                  <span className="ocultar-en-movil">{sesion.nombre}</span>
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
                  {esSuDuenio && (
                    <Link to="/panel" className="menu-item" role="menuitem" onClick={cerrar}>
                      <Icono nombre="tienda" medida={18} />
                      Administrar tienda
                    </Link>
                  )}
                  <button type="button" className="menu-item" role="menuitem" onClick={() => salir()}>
                    <Icono nombre="salir" medida={18} />
                    Salir
                  </button>
                </>
              )}
            </MenuDesplegable>
          ) : (
            <button type="button" className="boton-cuenta" onClick={() => ingresar()}>
              <Icono nombre="usuario" />
              <span className="ocultar-en-movil">Ingresar</span>
            </button>
          )}

          <button type="button" className="boton-carrito" onClick={carrito.abrir} aria-label={`Carrito, ${carrito.cantidadTotal} productos`}>
            <Icono nombre="bolsa" medida={22} />
            {carrito.cantidadTotal > 0 && <span className="boton-carrito-cantidad">{carrito.cantidadTotal}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

/** Búsqueda de productos. En la portada filtra mientras se escribe; en otras páginas, lleva a la portada. */
function Buscador() {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const [texto, setTexto] = useState(params.get('q') ?? '');
  const enPortada = pathname === '/';

  useEffect(() => {
    setTexto(params.get('q') ?? '');
  }, [params]);

  function cambiar(valor: string) {
    setTexto(valor);
    if (!enPortada) return;
    const nuevos = new URLSearchParams(params);
    if (valor.trim()) nuevos.set('q', valor);
    else nuevos.delete('q');
    setParams(nuevos, { replace: true });
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const q = texto.trim();
    navegar({ pathname: '/', search: q ? `?q=${encodeURIComponent(q)}` : '', hash: '#productos' });
  }

  return (
    <form className="buscador" role="search" onSubmit={enviar}>
      <Icono nombre="buscar" medida={18} />
      <input
        type="search"
        value={texto}
        onChange={(e) => cambiar(e.target.value)}
        placeholder="Buscar productos"
        aria-label="Buscar productos"
      />
    </form>
  );
}
