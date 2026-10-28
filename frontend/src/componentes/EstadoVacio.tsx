import type { ReactNode } from 'react';
import Icono, { type NombreIcono } from './Icono';

interface Props {
  icono: NombreIcono;
  titulo: string;
  children?: ReactNode;
  acciones?: ReactNode;
}

export default function EstadoVacio({ icono, titulo, children, acciones }: Props) {
  return (
    <div className="estado-vacio">
      <span className="estado-vacio-icono">
        <Icono nombre={icono} medida={28} />
      </span>
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
      {acciones && <div className="estado-vacio-acciones">{acciones}</div>}
    </div>
  );
}
