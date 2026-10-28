import { useState } from 'react';
import Icono from '../componentes/Icono';
import { useToast } from '../componentes/Toasts';
import { copiar, sinProtocolo } from '../formato';

export const CLAVE_COMPARTIDA = 'panel.tienda-compartida';

/** La dirección de la tienda, con botones para copiarla y abrirla. */
export default function EnlaceTienda({ url, onCopiado }: { url: string; onCopiado?: () => void }) {
  const toast = useToast();
  const [copiado, setCopiado] = useState(false);

  async function alCopiar() {
    if (await copiar(url)) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
      toast({ tipo: 'exito', titulo: 'Enlace copiado', detalle: 'Compartilo con tus clientes.' });
      try {
        localStorage.setItem(CLAVE_COMPARTIDA, '1');
      } catch {
        // No pasa nada si no se puede recordar.
      }
      onCopiado?.();
    }
  }

  return (
    <div className="enlace-tienda">
      <Icono nombre="enlace" medida={18} />
      <span className="enlace-tienda-url">{sinProtocolo(url)}</span>
      <button type="button" className="boton boton-secundario boton-chico" onClick={alCopiar}>
        <Icono nombre={copiado ? 'check' : 'copiar'} medida={16} />
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
      <a href={url} target="_blank" rel="noreferrer" className="boton boton-secundario boton-chico">
        <Icono nombre="externo" medida={16} />
        Abrir
      </a>
    </div>
  );
}
