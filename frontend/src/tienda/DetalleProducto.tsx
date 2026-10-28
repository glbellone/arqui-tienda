import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { esIdDeProducto, tiendaActual, type Producto, type Tienda } from '../api';
import AvisoError from '../componentes/AvisoError';
import { Esqueleto } from '../componentes/Esqueleto';
import Icono from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { formatearPrecio } from '../formato';
import { useCarga } from '../hooks/useCarga';
import { useTitulo } from '../hooks/useTitulo';
import Cantidad from './Cantidad';
import { useCarrito } from './carrito';
import NoEncontrada from './NoEncontrada';
import TarjetaProducto from './TarjetaProducto';

export default function DetalleProducto({ tienda }: { tienda: Tienda }) {
  const { productoId = '' } = useParams();
  const idValido = esIdDeProducto(productoId);
  const [carga, recargar] = useCarga<Producto | null>(
    () => (idValido ? tiendaActual.producto(productoId) : Promise.resolve(null)),
    [productoId, idValido],
  );

  if (!idValido || (carga.estado === 'listo' && !carga.datos)) return <NoEncontrada />;
  if (carga.estado === 'error' && carga.problema.status === 404) return <NoEncontrada />;

  return (
    <div className="pagina-tienda">
      <nav className="migas" aria-label="Estás en">
        <Link to="/">Inicio</Link>
        <Icono nombre="derecha" medida={14} />
        <Link to={{ pathname: '/', hash: '#productos' }}>Productos</Link>
        {carga.estado === 'listo' && carga.datos && (
          <>
            <Icono nombre="derecha" medida={14} />
            <span aria-current="page">{carga.datos.nombre}</span>
          </>
        )}
      </nav>

      {carga.estado === 'cargando' && (
        <div className="detalle-producto" aria-busy="true">
          <Esqueleto className="esqueleto-imagen" />
          <div className="detalle-producto-info">
            <Esqueleto className="esqueleto-titulo" />
            <Esqueleto className="esqueleto-linea esqueleto-corta" />
          </div>
        </div>
      )}
      {carga.estado === 'error' && <AvisoError problema={carga.problema} onReintentar={recargar} />}
      {carga.estado === 'listo' && carga.datos && <Ficha producto={carga.datos} tienda={tienda} />}

      {carga.estado === 'listo' && carga.datos && <Relacionados actual={carga.datos.id} />}
    </div>
  );
}

function Ficha({ producto, tienda }: { producto: Producto; tienda: Tienda }) {
  useTitulo(`${producto.nombre} · ${tienda.nombre}`);
  const carrito = useCarrito();
  const navegar = useNavigate();
  const [cantidad, setCantidad] = useState(1);

  function agregar() {
    carrito.agregar(producto, cantidad);
    carrito.abrir();
  }

  function comprarAhora() {
    carrito.agregar(producto, cantidad);
    navegar('/checkout');
  }

  return (
    <article className="detalle-producto">
      <ImagenProducto id={producto.id} nombre={producto.nombre} className="detalle-producto-imagen" />
      <div className="detalle-producto-info">
        <h1 className="detalle-producto-nombre">{producto.nombre}</h1>
        <p className="detalle-producto-precio">{formatearPrecio(producto.precio)}</p>

        <div className="detalle-producto-compra">
          <Cantidad valor={cantidad} onCambiar={setCantidad} />
          <button type="button" className="boton boton-grande" onClick={agregar}>
            <Icono nombre="bolsa" medida={18} />
            Agregar al carrito
          </button>
        </div>
        <button type="button" className="boton boton-secundario boton-grande boton-bloque" onClick={comprarAhora}>
          Comprar ahora
        </button>

        <ul className="detalle-producto-beneficios">
          <li>
            <Icono nombre="candado" medida={18} />
            Compra segura en {tienda.nombre}
          </li>
          <li>
            <Icono nombre="etiqueta" medida={18} />
            El precio incluye impuestos
          </li>
        </ul>
      </div>
    </article>
  );
}

function Relacionados({ actual }: { actual: string }) {
  const [carga] = useCarga(() => tiendaActual.productos(), []);
  if (carga.estado !== 'listo') return null;
  const otros = carga.datos.filter((p) => p.id !== actual).slice(-4).reverse();
  if (otros.length === 0) return null;

  return (
    <section className="relacionados" aria-labelledby="titulo-relacionados">
      <h2 id="titulo-relacionados" className="titulo-seccion">
        También te puede interesar
      </h2>
      <ul className="grilla-productos">
        {otros.map((p) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </ul>
    </section>
  );
}
