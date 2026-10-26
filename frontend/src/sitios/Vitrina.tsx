import { useEffect, useState } from 'react';
import { aProblema, formatearPrecio, tiendaActual, type Problema, type Producto, type Tienda } from '../api';
import AvisoError from '../componentes/AvisoError';
import SelloCelda from '../componentes/SelloCelda';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; productos: Producto[]; celda: string | null }
  | { tipo: 'error'; problema: Problema };

/** Vitrina pública de la tienda del subdominio: el comprador ve solo esta tienda. */
export default function Vitrina({ tienda }: { tienda: Tienda }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    tiendaActual
      .productos()
      .then(({ datos, celda }) => setEstado({ tipo: 'listo', productos: datos, celda }))
      .catch((error) => setEstado({ tipo: 'error', problema: aProblema(error) }));
  }, []);

  return (
    <>
      <div className="banda">
        <div>
          <span className={`plan plan-claro ${tienda.plan === 'Premium' ? 'plan-premium' : ''}`}>{tienda.plan}</span>
          <h1 className="banda-nombre">{tienda.nombre}</h1>
          <p className="banda-rubro">{tienda.rubro}</p>
        </div>
        {estado.tipo === 'listo' && <SelloCelda celda={estado.celda} />}
      </div>

      {estado.tipo === 'cargando' && <p className="nota">Cargando productos…</p>}
      {estado.tipo === 'error' && <AvisoError problema={estado.problema} />}

      {estado.tipo === 'listo' && estado.productos.length === 0 && (
        <div className="vacio">
          <p>Esta tienda todavía no tiene productos.</p>
        </div>
      )}

      {estado.tipo === 'listo' && estado.productos.length > 0 && (
        <ul className="grilla">
          {estado.productos.map((p) => (
            <li key={p.id} className="producto">
              <span className="producto-nombre">{p.nombre}</span>
              <span className="producto-sku">{p.sku}</span>
              <span className="producto-precio">{formatearPrecio(p.precio)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
