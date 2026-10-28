import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AvisoError from '../componentes/AvisoError';
import { Esqueleto } from '../componentes/Esqueleto';
import EstadoVacio from '../componentes/EstadoVacio';
import Icono from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { formatearPrecio, plural } from '../formato';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import type { ContextoPanel } from './Panel';

/** Listado de productos de la tienda, con búsqueda. */
export default function Productos({ tienda, productos, recargarProductos }: ContextoPanel) {
  useTitulo(`Productos · ${tienda.nombre}`);
  const [busqueda, setBusqueda] = useState('');
  const { state } = useLocation();
  const recienCreado = (state as { creado?: string } | null)?.creado;

  const filtrados = useMemo(() => {
    if (productos.estado !== 'listo') return [];
    const q = busqueda.trim().toLowerCase();
    const lista = [...productos.datos].reverse();
    return q ? lista.filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : lista;
  }, [productos, busqueda]);

  const total = productos.estado === 'listo' ? productos.datos.length : 0;
  const nuevo = (
    <Link to="/panel/productos/nuevo" className="boton">
      <Icono nombre="mas" medida={16} />
      Nuevo producto
    </Link>
  );

  return (
    <>
      <EncabezadoPagina
        titulo="Productos"
        descripcion={productos.estado === 'listo' ? plural(total, 'producto publicado', 'productos publicados') : 'Lo que ven tus clientes en la tienda.'}
        acciones={nuevo}
      />

      {productos.estado === 'error' && <AvisoError problema={productos.problema} onReintentar={recargarProductos} />}

      {productos.estado === 'listo' && total === 0 ? (
        <div className="tarjeta">
          <EstadoVacio icono="paquete" titulo="Cargá tu primer producto" acciones={nuevo}>
            Con un nombre y un precio ya aparece en tu tienda.
          </EstadoVacio>
        </div>
      ) : (
        <div className="tarjeta tarjeta-tabla">
          <div className="tabla-herramientas">
            <label className="buscador buscador-panel">
              <Icono nombre="buscar" medida={18} />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o SKU"
                aria-label="Buscar productos"
              />
            </label>
          </div>

          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">SKU</th>
                <th scope="col" className="alinear-derecha">
                  Precio
                </th>
                <th scope="col">
                  <span className="solo-lectores">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.estado === 'cargando' &&
                Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={4}>
                      <Esqueleto className="esqueleto-linea" />
                    </td>
                  </tr>
                ))}
              {filtrados.map((p) => (
                <tr key={p.id} className={p.id === recienCreado ? 'fila-nueva' : ''}>
                  <td>
                    <div className="celda-producto">
                      <ImagenProducto id={p.id} nombre={p.nombre} />
                      <span>{p.nombre}</span>
                      {p.id === recienCreado && <span className="insignia insignia-exito">Nuevo</span>}
                    </div>
                  </td>
                  <td className="texto-suave texto-mono">{p.sku}</td>
                  <td className="alinear-derecha">{formatearPrecio(p.precio)}</td>
                  <td className="alinear-derecha">
                    <a
                      href={`/productos/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="boton-icono"
                      aria-label={`Ver ${p.nombre} en la tienda`}
                      title="Ver en la tienda"
                    >
                      <Icono nombre="externo" medida={18} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {productos.estado === 'listo' && total > 0 && filtrados.length === 0 && (
            <p className="tabla-sin-resultados">No hay productos que coincidan con “{busqueda}”.</p>
          )}
        </div>
      )}
    </>
  );
}
