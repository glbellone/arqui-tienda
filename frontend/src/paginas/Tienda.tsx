import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorApi, formatearPrecio, listarProductos, type Problema, type Producto } from '../api';
import type { Sesion } from '../auth';
import AvisoError from '../componentes/AvisoError';
import SelloCelda from '../componentes/SelloCelda';
import { buscarTienda } from '../tiendas';
import NoEncontrada from './NoEncontrada';

interface Props {
  sesion: Sesion | null;
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; productos: Producto[]; celda: string | null }
  | { tipo: 'error'; problema: Problema };

/** Vitrina pública de una tienda: el comprador ve solo los productos de esta tienda. */
export default function TiendaPagina({ sesion }: Props) {
  const { tiendaId } = useParams();
  const tienda = buscarTienda(tiendaId);
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    if (!tienda) return;
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    listarProductos(tienda.id)
      .then(({ datos, celda }) => vigente && setEstado({ tipo: 'listo', productos: datos, celda }))
      .catch((e) => vigente && setEstado({ tipo: 'error', problema: aProblema(e) }));
    return () => {
      vigente = false;
    };
  }, [tienda]);

  if (!tienda) return <NoEncontrada />;
  const esSuDuenio = sesion?.tiendaId === tienda.id;

  return (
    <section style={{ '--tienda': tienda.color } as CSSProperties}>
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
          {esSuDuenio && (
            <Link to="/panel" className="boton">
              Cargar el primero
            </Link>
          )}
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
    </section>
  );
}

export function aProblema(error: unknown): Problema {
  if (error instanceof ErrorApi) return error.problema;
  return { title: 'Error inesperado', status: 0, detail: String(error) };
}
