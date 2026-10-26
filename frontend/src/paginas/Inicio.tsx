import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { TIENDAS } from '../tiendas';

export default function Inicio() {
  return (
    <section>
      <h1 className="titulo">Tiendas en la plataforma</h1>
      <p className="bajada">
        Cada tienda es un inquilino. Las estándar comparten la celda pool; cada Premium tiene su propia celda, con su
        instancia y su base de datos.
      </p>

      <ul className="lista-tiendas">
        {TIENDAS.map((tienda) => (
          <li key={tienda.id} style={{ '--tienda': tienda.color } as CSSProperties}>
            <Link to={`/tiendas/${tienda.id}`} className="fila-tienda">
              <span className="fila-color" aria-hidden="true" />
              <span className="fila-texto">
                <span className="fila-nombre">{tienda.nombre}</span>
                <span className="fila-rubro">{tienda.rubro}</span>
              </span>
              <span className={`plan ${tienda.plan === 'Premium' ? 'plan-premium' : ''}`}>{tienda.plan}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
