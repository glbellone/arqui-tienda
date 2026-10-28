import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** Contenido del botón que abre el menú. */
  disparador: ReactNode;
  etiqueta: string;
  /** Recibe una función para cerrar el menú, útil al elegir una opción. */
  children: (cerrar: () => void) => ReactNode;
  alineacion?: 'izquierda' | 'derecha';
  claseDisparador?: string;
}

/** Menú que se abre con un botón y se cierra con Escape o al hacer clic afuera. */
export default function MenuDesplegable({ disparador, etiqueta, children, alineacion = 'derecha', claseDisparador = '' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  return (
    <div className="menu" ref={contenedor}>
      <button
        type="button"
        className={claseDisparador}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={id}
        aria-label={etiqueta}
        onClick={() => setAbierto((a) => !a)}
      >
        {disparador}
      </button>
      {abierto && (
        <div id={id} className={`menu-lista menu-${alineacion}`} role="menu">
          {children(() => setAbierto(false))}
        </div>
      )}
    </div>
  );
}
