import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { crearProducto, formatearPrecio, listarProductos, type Problema, type Producto } from '../api';
import { ingresar, type Sesion } from '../auth';
import AvisoError from '../componentes/AvisoError';
import { buscarTienda, TIENDAS } from '../tiendas';
import { aProblema } from './Tienda';

interface Props {
  sesion: Sesion | null;
}

type Resultado = { tipo: 'ok'; producto: Producto; celda: string | null } | { tipo: 'error'; problema: Problema };

/** Panel del dueño: carga productos en su tienda (caso de uso mínimo del TP). */
export default function Panel({ sesion }: Props) {
  if (!sesion) {
    return (
      <section className="aviso-centrado">
        <h1 className="titulo">Panel del dueño</h1>
        <p className="bajada">Ingresá con el usuario de una tienda para cargar productos.</p>
        <button type="button" className="boton" onClick={ingresar}>
          Ingresar
        </button>
      </section>
    );
  }

  const miTienda = buscarTienda(sesion.tiendaId);
  if (!sesion.roles.includes('duenio') || !miTienda) {
    return (
      <section className="aviso-centrado">
        <h1 className="titulo">Panel del dueño</h1>
        <p className="bajada">Tu usuario no administra ninguna tienda, así que no puede cargar productos.</p>
        <Link to="/" className="boton boton-secundario">
          Ver las tiendas
        </Link>
      </section>
    );
  }

  return <PanelDuenio tiendaId={miTienda.id} />;
}

function PanelDuenio({ tiendaId }: { tiendaId: string }) {
  const miTienda = buscarTienda(tiendaId)!;
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [precio, setPrecio] = useState('');
  const [destino, setDestino] = useState(tiendaId);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);

  const recargar = useCallback(() => {
    listarProductos(tiendaId)
      .then(({ datos }) => setProductos(datos))
      .catch(() => setProductos([]));
  }, [tiendaId]);

  useEffect(recargar, [recargar]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      const { datos, celda } = await crearProducto(destino, { nombre, sku, precio: Number(precio) });
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

  return (
    <section style={{ '--tienda': miTienda.color } as CSSProperties}>
      <h1 className="titulo">Panel de {miTienda.nombre}</h1>
      <p className="bajada">
        Lo que cargues acá se ve en <Link to={`/tiendas/${miTienda.id}`}>la vitrina de tu tienda</Link>, y en ninguna
        otra.
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
          <label className="campo">
            <span>Cargar en la tienda</span>
            <select value={destino} onChange={(e) => setDestino(e.target.value)}>
              {TIENDAS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                  {t.id === tiendaId ? ' (la tuya)' : ''}
                </option>
              ))}
            </select>
            <small>Para la demo: elegí otra tienda y la API va a rechazar la carga.</small>
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
                  {resultado.producto.nombre} quedó en {buscarTienda(resultado.producto.tiendaId)?.nombre}, guardado
                  por la celda {resultado.celda ?? '—'}.
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
