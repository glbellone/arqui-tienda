import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { aProblema, formatearPrecio, tiendaActual, type Problema, type Producto, type Tienda } from '../api';
import { esDuenioDe, ingresar, type Sesion } from '../auth';
import AvisoError from '../componentes/AvisoError';

interface Props {
  tienda: Tienda;
  sesion: Sesion | null;
}

/**
 * Panel del dueño, en /panel del subdominio de su tienda. Ocultar el botón no alcanza:
 * si otro usuario entra directo a /panel, se lo frena acá, y la API igual rechaza la carga (403).
 */
export default function Panel({ tienda, sesion }: Props) {
  if (!sesion) {
    return (
      <section className="aviso-centrado">
        <h1 className="titulo">Panel de {tienda.nombre}</h1>
        <p className="bajada">Ingresá con el usuario del dueño para cargar productos.</p>
        <button type="button" className="boton" onClick={ingresar}>
          Ingresar
        </button>
      </section>
    );
  }

  if (!esDuenioDe(sesion, tienda.id)) {
    return (
      <section className="aviso-centrado">
        <h1 className="titulo">Panel de {tienda.nombre}</h1>
        <p className="bajada">Tu usuario no administra esta tienda.</p>
        <Link to="/" className="boton boton-secundario">
          Volver a la tienda
        </Link>
      </section>
    );
  }

  return <PanelDuenio tienda={tienda} />;
}

type Resultado = { tipo: 'ok'; producto: Producto; celda: string | null } | { tipo: 'error'; problema: Problema };

function PanelDuenio({ tienda }: { tienda: Tienda }) {
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [precio, setPrecio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);

  const recargar = useCallback(() => {
    tiendaActual
      .productos()
      .then(({ datos }) => setProductos(datos))
      .catch(() => setProductos([]));
  }, []);

  useEffect(recargar, [recargar]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      const { datos, celda } = await tiendaActual.crearProducto({ nombre, sku, precio: Number(precio) });
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
    <section>
      <h1 className="titulo">Panel de {tienda.nombre}</h1>
      <p className="bajada">
        Lo que cargues acá se ve en <Link to="/">la vitrina de tu tienda</Link>, y en ninguna otra.
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
