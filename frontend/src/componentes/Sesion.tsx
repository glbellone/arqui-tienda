import type { ReactNode } from 'react';
import { ingresar, salir, type Sesion as DatosSesion } from '../auth';

interface Props {
  sesion: DatosSesion | null;
  /** Acciones extra para el usuario logueado, por ejemplo el botón del panel. */
  children?: ReactNode;
}

/** Botones de sesión de la barra superior: Ingresar, o quién es y Salir. */
export default function Sesion({ sesion, children }: Props) {
  if (!sesion) {
    return (
      <div className="sesion">
        <button type="button" className="boton boton-secundario" onClick={ingresar}>
          Ingresar
        </button>
      </div>
    );
  }
  return (
    <div className="sesion">
      {children}
      <span className="sesion-quien">
        <strong>{sesion.nombre}</strong>
        <span>{sesion.usuario}</span>
      </span>
      <button type="button" className="boton boton-secundario" onClick={salir}>
        Salir
      </button>
    </div>
  );
}
