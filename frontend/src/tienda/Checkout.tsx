import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { aProblema, tiendaActual, type Pedido, type Tienda } from '../api';
import EstadoVacio from '../componentes/EstadoVacio';
import Icono from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { formatearMonto, plural } from '../formato';
import { useTitulo } from '../hooks/useTitulo';
import { useCarrito } from './carrito';

/**
 * Finalizar compra. Toma los datos de contacto y entrega, crea el pedido y lo cobra a través de la
 * pasarela simulada (ADR-007). Cada intento de compra lleva una clave de idempotencia: reintentar
 * después de un corte de red no genera un segundo cobro.
 */
export default function Checkout({ tienda }: { tienda: Tienda }) {
  useTitulo(`Finalizar compra · ${tienda.nombre}`);
  const carrito = useCarrito();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);

  // La clave está atada al contenido del carrito: se reutiliza en los reintentos del mismo carrito
  // y se renueva si el carrito cambia (con otra composición el backend rechaza la misma clave).
  const intento = useRef<{ firma: string; clave: string } | null>(null);

  function claveDelIntento(): string {
    const firma = JSON.stringify(
      carrito.items
        .map((i) => [i.productoId, i.cantidad] as const)
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    if (!intento.current || intento.current.firma !== firma) {
      intento.current = { firma, clave: crypto.randomUUID() };
    }
    return intento.current.clave;
  }

  // Va antes del chequeo de carrito vacío: al pagar, el carrito se vacía.
  if (pedido?.estado === 'PAGADO') {
    return (
      <div className="pagina-tienda">
        <EstadoVacio
          icono="bolsa"
          titulo="¡Pago aprobado!"
          acciones={
            <Link to="/" className="boton">
              Volver a la tienda
            </Link>
          }
        >
          Recibimos tu pedido por {formatearMonto(pedido.total.monto, pedido.total.moneda)}. Número de
          pedido: {pedido.id}
        </EstadoVacio>
      </div>
    );
  }

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

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    setPedido(null);
    try {
      const resultado = await tiendaActual.confirmarPedido(
        claveDelIntento(),
        carrito.items.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
      );
      setPedido(resultado);
      if (resultado.estado === 'PAGADO') {
        carrito.vaciar();
        intento.current = null;
      } else if (resultado.estado === 'RECHAZADO') {
        intento.current = null; // un intento nuevo necesita una clave nueva
      }
    } catch (err) {
      // Error de red o del servidor: se conserva la clave. Si el cobro llegó a hacerse,
      // reintentar devuelve ese mismo pedido en lugar de cobrar otra vez.
      setError(aProblema(err).detail);
    } finally {
      setEnviando(false);
    }
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

          {pedido?.estado === 'RECHAZADO' && (
            <div className="aviso aviso-error" role="alert">
              <Icono nombre="alerta" medida={20} />
              <div className="aviso-texto">
                <strong>El pago fue rechazado</strong>
                <p>No se realizó ningún cobro. Podés intentarlo de nuevo.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="aviso aviso-error" role="alert">
              <Icono nombre="alerta" medida={20} />
              <div className="aviso-texto">
                <strong>No pudimos completar el pago</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <button type="submit" className="boton boton-grande boton-bloque" disabled={enviando}>
            <Icono nombre="candado" medida={18} />
            {enviando ? 'Procesando pago…' : 'Continuar al pago'}
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
