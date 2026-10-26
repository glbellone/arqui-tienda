interface Props {
  celda: string | null;
}

/** Muestra qué celda atendió el pedido: la arquitectura, visible en la pantalla. */
export default function SelloCelda({ celda }: Props) {
  if (!celda) return null;
  const premium = celda !== 'pool';
  return (
    <div className={`sello ${premium ? 'sello-premium' : ''}`} title="Header X-Celda de la respuesta">
      <span className="sello-titulo">Atendida por la celda</span>
      <span className="sello-celda">{celda}</span>
      <span className="sello-nota">{premium ? 'Instancia y base dedicadas' : 'Compartida con otras tiendas'}</span>
    </div>
  );
}
