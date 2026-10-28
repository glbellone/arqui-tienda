import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icono from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { formatearMonto, formatearPrecio, plural } from '../formato';
import Cantidad from './Cantidad';
import { useCarrito } from './carrito';

/** Panel lateral con el carrito. */
export default function CajonCarrito() {
  const carrito = useCarrito();
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const { abierto, cerrar } = carrito;

  useEffect(() => {
    if (!abierto) return;
    botonCerrar.current?.focus();
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', alTecla);
    document.body.classList.add('sin-scroll');
    return () => {
      document.removeEventListener('keydown', alTecla);
      document.body.classList.remove('sin-scroll');
    };
  }, [abierto, cerrar]);

  if (!abierto) return null;

  return (
    <div className="cajon-fondo" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <aside className="cajon" role="dialog" aria-modal="true" aria-labelledby="titulo-carrito">
        <header className="cajon-encabezado">
          <h2 id="titulo-carrito">
            Tu carrito
            {carrito.cantidadTotal > 0 && <span className="cajon-cantidad">{plural(carrito.cantidadTotal, 'producto', 'productos')}</span>}
          </h2>
          <button ref={botonCerrar} type="button" className="boton-icono" onClick={cerrar} aria-label="Cerrar carrito">
            <Icono nombre="cerrar" />
          </button>
        </header>

        {carrito.items.length === 0 ? (
          <div className="cajon-vacio">
            <span className="estado-vacio-icono">
              <Icono nombre="bolsa" medida={28} />
            </span>
            <p>Tu carrito está vacío.</p>
            <button type="button" className="boton" onClick={cerrar}>
              Ver productos
            </button>
          </div>
        ) : (
          <>
            <ul className="cajon-items">
              {carrito.items.map((item) => (
                <li key={item.productoId} className="item-carrito">
                  <Link to={`/productos/${item.productoId}`} onClick={cerrar} className="item-carrito-imagen">
                    <ImagenProducto id={item.productoId} nombre={item.nombre} />
                  </Link>
                  <div className="item-carrito-datos">
                    <Link to={`/productos/${item.productoId}`} onClick={cerrar} className="item-carrito-nombre">
                      {item.nombre}
                    </Link>
                    <span className="item-carrito-unitario">{formatearPrecio(item.precio)} c/u</span>
                    <div className="item-carrito-acciones">
                      <Cantidad
                        valor={item.cantidad}
                        minimo={1}
                        onCambiar={(n) => carrito.cambiarCantidad(item.productoId, n)}
                        etiqueta={`Cantidad de ${item.nombre}`}
                      />
                      <button
                        type="button"
                        className="boton-icono boton-quitar"
                        onClick={() => carrito.quitar(item.productoId)}
                        aria-label={`Quitar ${item.nombre}`}
                      >
                        <Icono nombre="basura" medida={18} />
                      </button>
                    </div>
                  </div>
                  <span className="item-carrito-total">{formatearMonto(item.precio.monto * item.cantidad, item.precio.moneda)}</span>
                </li>
              ))}
            </ul>

            <footer className="cajon-pie">
              <div className="cajon-subtotal">
                <span>Subtotal</span>
                <strong>{formatearMonto(carrito.subtotal)}</strong>
              </div>
              <p className="cajon-nota">El envío se calcula al finalizar la compra.</p>
              <Link to="/checkout" className="boton boton-bloque boton-grande" onClick={cerrar}>
                Iniciar compra
              </Link>
              <button type="button" className="boton boton-fantasma boton-bloque" onClick={cerrar}>
                Seguir comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
