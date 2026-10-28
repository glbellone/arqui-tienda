import { Link } from 'react-router-dom';
import type { Producto } from '../api';
import Icono from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { useToast } from '../componentes/Toasts';
import { formatearPrecio } from '../formato';
import { useCarrito } from './carrito';

export default function TarjetaProducto({ producto }: { producto: Producto }) {
  const { agregar } = useCarrito();
  const toast = useToast();

  function agregarAlCarrito() {
    agregar(producto);
    toast({ tipo: 'exito', titulo: 'Agregado al carrito', detalle: producto.nombre });
  }

  return (
    <li className="tarjeta-producto">
      <Link to={`/productos/${producto.id}`} className="tarjeta-producto-enlace">
        <ImagenProducto id={producto.id} nombre={producto.nombre} />
        <span className="tarjeta-producto-nombre">{producto.nombre}</span>
        <span className="tarjeta-producto-precio">{formatearPrecio(producto.precio)}</span>
      </Link>
      <button type="button" className="boton boton-secundario boton-chico boton-bloque" onClick={agregarAlCarrito}>
        <Icono nombre="bolsa" medida={16} />
        Agregar al carrito
      </button>
    </li>
  );
}
