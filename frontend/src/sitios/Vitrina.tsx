import { useEffect, useState, type CSSProperties } from 'react';
import { aProblema, formatearPrecio, vitrina, type Problema, type Producto, type Tienda } from '../api';
import AvisoError from '../componentes/AvisoError';
import SelloCelda from '../componentes/SelloCelda';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; tienda: Tienda; productos: Producto[]; celda: string | null }
  | { tipo: 'error'; problema: Problema };

/** Vitrina pública de la tienda del subdominio: el comprador ve solo esta tienda. */
export default function Vitrina() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    Promise.all([vitrina.tienda(), vitrina.productos()])
      .then(([tienda, productos]) => {
        document.title = tienda.datos.nombre;
        setEstado({ tipo: 'listo', tienda: tienda.datos, productos: productos.datos, celda: productos.celda });
      })
      .catch((error) => setEstado({ tipo: 'error', problema: aProblema(error) }));
  }, []);

  if (estado.tipo === 'cargando') {
    return (
      <main className="contenido">
        <p className="nota">Cargando la tienda…</p>
      </main>
    );
  }

  if (estado.tipo === 'error') {
    return (
      <main className="contenido">
        <h1 className="titulo">{estado.problema.status === 404 ? 'Esta tienda no existe' : 'No se pudo abrir la tienda'}</h1>
        <AvisoError problema={estado.problema} />
      </main>
    );
  }

  const { tienda, productos, celda } = estado;
  return (
    <div className="marco" style={{ '--tienda': tienda.color } as CSSProperties}>
      <main className="contenido">
        <div className="banda">
          <div>
            <span className={`plan plan-claro ${tienda.plan === 'Premium' ? 'plan-premium' : ''}`}>{tienda.plan}</span>
            <h1 className="banda-nombre">{tienda.nombre}</h1>
            <p className="banda-rubro">{tienda.rubro}</p>
          </div>
          <SelloCelda celda={celda} />
        </div>

        {productos.length === 0 ? (
          <div className="vacio">
            <p>Esta tienda todavía no tiene productos.</p>
          </div>
        ) : (
          <ul className="grilla">
            {productos.map((p) => (
              <li key={p.id} className="producto">
                <span className="producto-nombre">{p.nombre}</span>
                <span className="producto-sku">{p.sku}</span>
                <span className="producto-precio">{formatearPrecio(p.precio)}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="pie">Tienda publicada con Vidriera</footer>
    </div>
  );
}
