import { useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { tiendaActual, type Producto, type Tienda } from '../api';
import { esDuenioDe, type Sesion } from '../auth';
import AvisoError from '../componentes/AvisoError';
import { GrillaEsqueleto } from '../componentes/Esqueleto';
import EstadoVacio from '../componentes/EstadoVacio';
import Monograma from '../componentes/Monograma';
import { plural } from '../formato';
import { useCarga } from '../hooks/useCarga';
import { useTitulo } from '../hooks/useTitulo';
import TarjetaProducto from './TarjetaProducto';

const ORDENES = {
  nuevos: 'Más nuevos',
  'precio-asc': 'Menor precio',
  'precio-desc': 'Mayor precio',
  nombre: 'Nombre (A-Z)',
} as const;

type Orden = keyof typeof ORDENES;

function ordenar(productos: Producto[], orden: Orden): Producto[] {
  const copia = [...productos];
  switch (orden) {
    case 'precio-asc':
      return copia.sort((a, b) => a.precio.monto - b.precio.monto);
    case 'precio-desc':
      return copia.sort((a, b) => b.precio.monto - a.precio.monto);
    case 'nombre':
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    default:
      // La API devuelve los productos en orden de carga: los más nuevos van primero.
      return copia.reverse();
  }
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

interface Props {
  tienda: Tienda;
  sesion: Sesion | null;
}

/** Portada de la tienda: presentación y catálogo, con búsqueda y orden. */
export default function Portada({ tienda, sesion }: Props) {
  useTitulo(tienda.nombre);
  const [carga, recargar] = useCarga(() => tiendaActual.productos(), []);
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const busqueda = params.get('q')?.trim() ?? '';
  const ordenParam = params.get('orden');
  const orden: Orden = ordenParam && ordenParam in ORDENES ? (ordenParam as Orden) : 'nuevos';

  const visibles = useMemo(() => {
    if (carga.estado !== 'listo') return [];
    const filtro = normalizar(busqueda);
    const filtrados = filtro ? carga.datos.filter((p) => normalizar(p.nombre).includes(filtro)) : carga.datos;
    return ordenar(filtrados, orden);
  }, [carga, busqueda, orden]);

  useEffect(() => {
    if (hash === '#productos') document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
  }, [hash, carga.estado]);

  function cambiarOrden(valor: string) {
    const nuevos = new URLSearchParams(params);
    if (valor === 'nuevos') nuevos.delete('orden');
    else nuevos.set('orden', valor);
    setParams(nuevos, { replace: true });
  }

  const total = carga.estado === 'listo' ? carga.datos.length : 0;

  return (
    <>
      {!busqueda && (
        <section className="portada">
          <div className="portada-contenido">
            <p className="portada-antetitulo">Bienvenido a {tienda.nombre}</p>
            <h1 className="portada-titulo">{tienda.rubro}</h1>
            <p className="portada-bajada">Elegí tus productos, armá tu carrito y hacé tu pedido online.</p>
            <a href="#productos" className="boton boton-claro boton-grande">
              Ver productos
            </a>
          </div>
          <div className="portada-decoracion" aria-hidden="true">
            <span className="portada-circulo portada-circulo-1" />
            <span className="portada-circulo portada-circulo-2" />
            <Monograma nombre={tienda.nombre} medida="grande" />
          </div>
        </section>
      )}

      <section id="productos" className="catalogo" aria-labelledby="titulo-catalogo">
        <div className="catalogo-encabezado">
          <div>
            <h2 id="titulo-catalogo" className="titulo-seccion">
              {busqueda ? `Resultados para “${busqueda}”` : 'Productos'}
            </h2>
            {carga.estado === 'listo' && (
              <p className="catalogo-conteo">
                {busqueda ? plural(visibles.length, 'resultado', 'resultados') : plural(total, 'producto', 'productos')}
              </p>
            )}
          </div>
          {carga.estado === 'listo' && total > 1 && (
            <label className="selector-orden">
              <span>Ordenar por</span>
              <select className="control" value={orden} onChange={(e) => cambiarOrden(e.target.value)}>
                {Object.entries(ORDENES).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {carga.estado === 'cargando' && <GrillaEsqueleto />}
        {carga.estado === 'error' && <AvisoError problema={carga.problema} onReintentar={recargar} />}

        {carga.estado === 'listo' && total === 0 && (
          <EstadoVacio
            icono="paquete"
            titulo="Todavía no hay productos"
            acciones={
              esDuenioDe(sesion, tienda.id) && (
                <Link to="/panel/productos/nuevo" className="boton">
                  Cargar el primer producto
                </Link>
              )
            }
          >
            Muy pronto vas a encontrar acá los productos de {tienda.nombre}.
          </EstadoVacio>
        )}

        {carga.estado === 'listo' && total > 0 && visibles.length === 0 && (
          <EstadoVacio
            icono="buscar"
            titulo="No encontramos productos"
            acciones={
              <Link to="/" className="boton boton-secundario">
                Ver todos los productos
              </Link>
            }
          >
            Probá con otra palabra o revisá cómo está escrita.
          </EstadoVacio>
        )}

        {visibles.length > 0 && (
          <ul className="grilla-productos">
            {visibles.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
