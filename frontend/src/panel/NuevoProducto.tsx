import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { aProblema, tiendaActual, type Problema } from '../api';
import AvisoError from '../componentes/AvisoError';
import Icono from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { useToast } from '../componentes/Toasts';
import { formatearMonto, sugerirSku } from '../formato';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import type { ContextoPanel } from './Panel';

/** Alta de un producto: el caso de uso mínimo del TP, con vista previa de cómo se ve en la tienda. */
export default function NuevoProducto({ tienda, recargarProductos }: ContextoPanel) {
  useTitulo(`Nuevo producto · ${tienda.nombre}`);
  const navegar = useNavigate();
  const toast = useToast();

  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [skuEditado, setSkuEditado] = useState(false);
  const [precio, setPrecio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorSku, setErrorSku] = useState<string | null>(null);
  const [error, setError] = useState<Problema | null>(null);

  const monto = Number(precio);
  const precioValido = precio !== '' && Number.isFinite(monto) && monto >= 0;

  function cambiarNombre(valor: string) {
    setNombre(valor);
    if (!skuEditado) setSku(sugerirSku(valor));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setErrorSku(null);
    try {
      const creado = await tiendaActual.crearProducto({ nombre: nombre.trim(), sku: sku.trim(), precio: monto });
      recargarProductos();
      toast({ tipo: 'exito', titulo: 'Producto publicado', detalle: `${creado.nombre} ya se ve en tu tienda.` });
      navegar('/panel/productos', { state: { creado: creado.id } });
    } catch (err) {
      const problema = aProblema(err);
      // Un SKU repetido es un error del campo, no del formulario entero.
      if (problema.status === 409) setErrorSku(problema.detail);
      else setError(problema);
      setEnviando(false);
    }
  }

  return (
    <>
      <EncabezadoPagina
        antes={
          <Link to="/panel/productos" className="volver">
            <Icono nombre="izquierda" medida={16} />
            Productos
          </Link>
        }
        titulo="Nuevo producto"
        descripcion="Completá los datos y publicalo en tu tienda."
      />

      <div className="grilla-formulario">
        <form className="tarjeta formulario" onSubmit={enviar} noValidate={false}>
          {error && <AvisoError problema={error} />}

          <label className="campo">
            <span>Nombre</span>
            <input
              className="control"
              value={nombre}
              onChange={(e) => cambiarNombre(e.target.value)}
              placeholder="Ej.: Mate imperial de calabaza"
              required
              maxLength={200}
              autoFocus
            />
          </label>

          <div className="campos-2">
            <label className="campo">
              <span>Precio</span>
              <span className="control-con-prefijo">
                <span className="prefijo">$</span>
                <input
                  className="control"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0"
                  required
                />
              </span>
            </label>

            <label className="campo">
              <span>SKU</span>
              <input
                className={`control texto-mono ${errorSku ? 'control-error' : ''}`}
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value.toUpperCase());
                  setSkuEditado(true);
                  setErrorSku(null);
                }}
                required
                maxLength={64}
                aria-invalid={!!errorSku}
                aria-describedby="ayuda-sku"
              />
              <small id="ayuda-sku" className={errorSku ? 'error-campo' : 'ayuda'}>
                {errorSku ?? 'Código interno para identificar el producto. Tus clientes no lo ven.'}
              </small>
            </label>
          </div>

          <div className="formulario-acciones">
            <Link to="/panel/productos" className="boton boton-fantasma">
              Cancelar
            </Link>
            <button type="submit" className="boton" disabled={enviando}>
              {enviando ? <span className="girando" aria-hidden="true" /> : <Icono nombre="check" medida={16} />}
              {enviando ? 'Publicando…' : 'Publicar producto'}
            </button>
          </div>
        </form>

        <aside className="vista-previa" aria-label="Vista previa">
          <span className="vista-previa-titulo">Así se va a ver en tu tienda</span>
          <div className="tarjeta-producto tarjeta-producto-previa">
            <ImagenProducto id={sku || nombre || 'nuevo'} nombre={nombre || 'Producto'} />
            <span className="tarjeta-producto-nombre">{nombre.trim() || 'Nombre del producto'}</span>
            <span className="tarjeta-producto-precio">{precioValido ? formatearMonto(monto) : '$ —'}</span>
          </div>
        </aside>
      </div>
    </>
  );
}
