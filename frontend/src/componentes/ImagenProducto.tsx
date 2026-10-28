import { hash, iniciales } from '../formato';

interface Props {
  id: string;
  nombre: string;
  className?: string;
}

/**
 * Imagen de producto. La API todavía no guarda fotos, así que se genera una imagen con las
 * iniciales del producto sobre el color de la tienda, con una variación estable por producto.
 */
export default function ImagenProducto({ id, nombre, className = '' }: Props) {
  const h = hash(id || nombre);
  return (
    <div className={`imagen-producto variante-${h % 4} ${className}`} aria-hidden="true">
      <span className="imagen-producto-letras">{iniciales(nombre, 2, true)}</span>
    </div>
  );
}
