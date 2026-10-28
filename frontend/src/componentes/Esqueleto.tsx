/** Bloques grises animados mientras carga el contenido. */
export function Esqueleto({ className = '' }: { className?: string }) {
  return <span className={`esqueleto ${className}`} aria-hidden="true" />;
}

export function GrillaEsqueleto({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <ul className="grilla-productos" aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: cantidad }, (_, i) => (
        <li key={i} className="tarjeta-producto tarjeta-producto-cargando">
          <Esqueleto className="esqueleto-imagen" />
          <Esqueleto className="esqueleto-linea" />
          <Esqueleto className="esqueleto-linea esqueleto-corta" />
        </li>
      ))}
    </ul>
  );
}
