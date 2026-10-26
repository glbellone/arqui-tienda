import type { Problema } from '../api';

interface Props {
  problema: Problema;
}

/** Muestra un error de la API tal como llega: status, título y detalle (Problem Details). */
export default function AvisoError({ problema }: Props) {
  return (
    <div className="aviso aviso-error" role="alert">
      <span className="aviso-status">{problema.status || '—'}</span>
      <div>
        <strong>{problema.title}</strong>
        <p>{problema.detail}</p>
      </div>
    </div>
  );
}
