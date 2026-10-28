import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Tienda } from '../api';
import EstadoVacio from '../componentes/EstadoVacio';
import Icono from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { formatearMonto, plural } from '../formato';
import { useTitulo } from '../hooks/useTitulo';
import { useCarrito } from './carrito';

/**
 * Finalizar compra. Hoy arma el resumen y toma los datos de contacto y entrega; el pago se conecta
 * cuando exista el módulo Ventas, que crea el pedido y cobra a través de la pasarela (ADR-007).
 */
export default function Checkout({ tienda }: { tienda: Tienda }) {
  useTitulo(`Finalizar compra · ${tienda.nombre}`);
  const carrito = useCarrito();
  const [intentoPagar, setIntentoPagar] = useState(false);

  if (carrito.items.length === 0) {
    return (
      <div className="pagina-tienda">
        <EstadoVacio
          icono="bolsa"
          titulo="Tu carrito está vacío"
          acciones={
            <Link to={{ pathname: '/', hash: '#productos' }} className="boton">
              Ver productos
            </Link>
          }
        >
          Agregá productos para iniciar tu compra.
        </EstadoVacio>
      </div>
    );
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntentoPagar(true);
  }

  return (
    <div className="pagina-tienda">
      <Link to="/" className="volver">
        <Icono nombre="izquierda" medida={16} />
        Seguir comprando
      </Link>
      <h1 className="titulo-pagina">Finalizar compra</h1>

      <div className="checkout">
        <form className="checkout-formulario" onSubmit={enviar}>
          <fieldset className="tarjeta">
            <legend className="tarjeta-titulo">Tus datos</legend>
            <div className="campos-2">
              <label className="campo">
                <span>Nombre y apellido</span>
                <input className="control" name="nombre" autoComplete="name" required />
              </label>
              <label className="campo">
                <span>Teléfono</span>
                <input className="control" name="telefono" type="tel" autoComplete="tel" />
              </label>
            </div>
            <label className="campo">
              <span>Email</span>
              <input className="control" name="email" type="email" autoComplete="email" required />
              <small className="ayuda">Te enviamos ahí la confirmación del pedido.</small>
            </label>
          </fieldset>

          <fieldset className="tarjeta">
            <legend className="tarjeta-titulo">Entrega</legend>
            <label className="campo">
              <span>Dirección</span>
              <input className="control" name="direccion" autoComplete="street-address" required />
            </label>
            <div className="campos-2">
              <label className="campo">
                <span>Ciudad</span>
                <input className="control" name="ciudad" autoComplete="address-level2" required />
              </label>
              <label className="campo">
                <span>Código postal</span>
                <input className="control" name="cp" autoComplete="postal-code" required />
              </label>
            </div>
          </fieldset>

          {intentoPagar && (
            <div className="aviso aviso-info" role="status">
              <Icono nombre="alerta" medida={20} />
              <div className="aviso-texto">
                <strong>El pago online todavía no está disponible</strong>
                <p>Guardamos tu carrito para que puedas completar la compra más adelante.</p>
              </div>
            </div>
          )}

          <button type="submit" className="boton boton-grande boton-bloque">
            <Icono nombre="candado" medida={18} />
            Continuar al pago
          </button>
        </form>

        <aside className="tarjeta checkout-resumen" aria-labelledby="titulo-resumen">
          <h2 id="titulo-resumen" className="tarjeta-titulo">
            Tu pedido <span className="texto-suave">({plural(carrito.cantidadTotal, 'producto', 'productos')})</span>
          </h2>
          <ul className="resumen-items">
            {carrito.items.map((item) => (
              <li key={item.productoId}>
                <span className="resumen-imagen">
                  <ImagenProducto id={item.productoId} nombre={item.nombre} />
                  <span className="resumen-cantidad">{item.cantidad}</span>
                </span>
                <span className="resumen-nombre">{item.nombre}</span>
                <span>{formatearMonto(item.precio.monto * item.cantidad, item.precio.moneda)}</span>
              </li>
            ))}
          </ul>
          <dl className="resumen-totales">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatearMonto(carrito.subtotal)}</dd>
            </div>
            <div>
              <dt>Envío</dt>
              <dd className="texto-suave">A calcular</dd>
            </div>
            <div className="resumen-total">
              <dt>Total</dt>
              <dd>{formatearMonto(carrito.subtotal)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
