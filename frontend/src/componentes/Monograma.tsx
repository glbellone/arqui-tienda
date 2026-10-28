import { iniciales } from '../formato';

/** Logo provisorio de la tienda: sus iniciales sobre su color. */
export default function Monograma({ nombre, medida = 'normal' }: { nombre: string; medida?: 'chico' | 'normal' | 'grande' }) {
  return (
    <span className={`monograma monograma-${medida}`} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  );
}
