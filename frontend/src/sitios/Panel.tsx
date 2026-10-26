import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { aProblema, formatearPrecio, panel, type Problema, type Producto, type Tienda } from '../api';
import { ingresar, salir, sesionActual, type Sesion } from '../auth';
import AvisoError from '../componentes/AvisoError';

/** Panel de los dueños, en panel.{dominio}. Cada dueño ve y carga solo su tienda (la del token). */
export default function Panel() {
  const sesion = sesionActual();

  return (
    <div className="marco">
      <header className="barra">
        <span className="marca">
          Vidriera <span className="marca-detalle">Panel</span>
        </span>
        <div className="sesion">
          {sesion ? (
            <>
              <span className="sesion-quien">
                <strong>{sesion.nombre}</strong>
                <span>{sesion.usuario}</span>
              </span>
              <button type="button" className="boton boton-secundario" onClick={salir}>
                Salir
              </button>
            </>
          ) : (
            <button type="button" className="boton" onClick={ingresar}>
              Ingresar
            </button>
          )}
        </div>
      </header>
      <main className="contenido">
        <Contenido sesion={sesion} />
      </main>
    </div>
  );
}

function Contenido({ sesion }: { sesion: Sesion | null }) {
  if (!sesion) {
    return (
      <section className="aviso-centrado">
        <h1 className="titulo">Panel del dueño</h1>
        <p className="bajada">Ingresá con el usuario de tu tienda para cargar productos.</p>
        <button type="button" className="boton" onClick={ingresar}>
          Ingresar
        </button>
      </section>
    );
  }

  if (!sesion.roles.includes('duenio') || !sesion.tiendaId) {
    return (
      <section className="aviso-centrado">
        <h1 className="titulo">Panel del dueño</h1>
        <p className="bajada">Tu usuario no administra ninguna tienda, así que no tiene nada para cargar acá.</p>
      </section>
    );
  }

  return <PanelDuenio tiendaId={sesion.tiendaId} />;
}

type Resultado = { tipo: 'ok'; producto: Producto; celda: string | null } | { tipo: 'error'; problema: Problema };

function PanelDuenio({ tiendaId }: { tiendaId: string }) {
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [errorTienda, setErrorTienda] = useState<Problema | null>(null);
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [precio, setPrecio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    panel
      .tienda(tiendaId)
      .then(({ datos }) => setTienda(datos))
      .catch((error) => setErrorTienda(aProblema(error)));
  }, [tiendaId]);

  const recargar = useCallback(() => {
    panel
      .productos(tiendaId)
      .then(({ datos }) => setProductos(datos))
      .catch(() => setProductos([]));
  }, [tiendaId]);

  useEffect(recargar, [recargar]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      const { datos, celda } = await panel.crearProducto(tiendaId, { nombre, sku, precio: Number(precio) });
      setResultado({ tipo: 'ok', producto: datos, celda });
      setNombre('');
      setSku('');
      setPrecio('');
      recargar();
    } catch (error) {
      setResultado({ tipo: 'error', problema: aProblema(error) });
    } finally {
      setEnviando(false);
    }
  }

  if (errorTienda) return <AvisoError problema={errorTienda} />;
  if (!tienda) return <p className="nota">Cargando tu tienda…</p>;

  return (
    <section style={{ '--tienda': tienda.color } as CSSProperties}>
      <h1 className="titulo">Panel de {tienda.nombre}</h1>
      <p className="bajada">
        Tu tienda se publica en{' '}
        <a href={tienda.url} target="_blank" rel="noreferrer">
          {tienda.url.replace(/^https?:\/\//, '')}
        </a>
        . Lo que cargues acá se ve ahí, y en ninguna otra tienda.
      </p>

      <div className="panel">
        <form className="formulario" onSubmit={enviar}>
          <h2 className="subtitulo">Nuevo producto</h2>

          <label className="campo">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={200} />
          </label>
          <label className="campo">
            <span>SKU</span>
            <input value={sku} onChange={(e) => setSku(e.target.value)} required maxLength={64} />
          </label>
          <label className="campo">
            <span>Precio en pesos</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Cargando…' : 'Cargar producto'}
          </button>

          {resultado?.tipo === 'ok' && (
            <div className="aviso aviso-ok" role="status">
              <span className="aviso-status">201</span>
              <div>
                <strong>Producto cargado</strong>
                <p>
                  {resultado.producto.nombre} quedó en {tienda.nombre}, guardado por la celda {resultado.celda ?? '—'}.
                </p>
              </div>
            </div>
          )}
          {resultado?.tipo === 'error' && <AvisoError problema={resultado.problema} />}
        </form>

        <div className="mis-productos">
          <h2 className="subtitulo">Productos de tu tienda</h2>
          {productos.length === 0 ? (
            <p className="nota">Todavía no cargaste productos.</p>
          ) : (
            <ul className="lista-simple">
              {productos.map((p) => (
                <li key={p.id}>
                  <span>
                    {p.nombre} <span className="producto-sku">{p.sku}</span>
                  </span>
                  <span>{formatearPrecio(p.precio)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
