import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  antes?: ReactNode;
}

/** Encabezado de cada página del panel. */
export default function EncabezadoPagina({ titulo, descripcion, acciones, antes }: Props) {
  return (
    <div className="encabezado-pagina">
      {antes}
      <div className="encabezado-pagina-fila">
        <div>
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
        {acciones && <div className="encabezado-pagina-acciones">{acciones}</div>}
      </div>
    </div>
  );
}
