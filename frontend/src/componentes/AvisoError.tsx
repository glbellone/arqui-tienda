import type { Problema } from '../api';
import Icono from './Icono';

interface Props {
  problema: Problema;
  /** Acción opcional, por ejemplo reintentar. */
  onReintentar?: () => void;
}

/** Muestra un error de la API (Problem Details) con su título y detalle, sin códigos HTTP. */
export default function AvisoError({ problema, onReintentar }: Props) {
  return (
    <div className="aviso aviso-error" role="alert">
      <Icono nombre="alerta" medida={20} />
      <div className="aviso-texto">
        <strong>{problema.title}</strong>
        <p>{problema.detail}</p>
      </div>
      {onReintentar && (
        <button type="button" className="boton boton-secundario boton-chico" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
