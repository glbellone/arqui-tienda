import Icono from '../componentes/Icono';
import { CANTIDAD_MAXIMA } from './carrito';

interface Props {
  valor: number;
  onCambiar: (valor: number) => void;
  minimo?: number;
  etiqueta?: string;
}

/** Selector de cantidad con botones − y +. */
export default function Cantidad({ valor, onCambiar, minimo = 1, etiqueta = 'Cantidad' }: Props) {
  return (
    <div className="cantidad" role="group" aria-label={etiqueta}>
      <button type="button" onClick={() => onCambiar(valor - 1)} disabled={valor <= minimo} aria-label="Restar uno">
        <Icono nombre="menos" medida={16} />
      </button>
      <span aria-live="polite">{valor}</span>
      <button type="button" onClick={() => onCambiar(valor + 1)} disabled={valor >= CANTIDAD_MAXIMA} aria-label="Sumar uno">
        <Icono nombre="mas" medida={16} />
      </button>
    </div>
  );
}
