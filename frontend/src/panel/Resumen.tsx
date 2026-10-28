import { useState } from 'react';
import { Link } from 'react-router-dom';
import AvisoError from '../componentes/AvisoError';
import { Esqueleto } from '../componentes/Esqueleto';
import Icono, { type NombreIcono } from '../componentes/Icono';
import ImagenProducto from '../componentes/ImagenProducto';
import { formatearMonto, formatearPrecio } from '../formato';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import EnlaceTienda, { CLAVE_COMPARTIDA } from './EnlaceTienda';
import type { ContextoPanel } from './Panel';

function yaCompartio(): boolean {
  try {
    return localStorage.getItem(CLAVE_COMPARTIDA) === '1';
  } catch {
    return false;
  }
}

/** Inicio del panel: un vistazo a la tienda y los próximos pasos. */
export default function Resumen({ tienda, sesion, productos, recargarProductos }: ContextoPanel) {
  useTitulo(`Inicio · ${tienda.nombre}`);
  const [compartio, setCompartio] = useState(yaCompartio);

  const lista = productos.estado === 'listo' ? productos.datos : [];
  const cantidad = lista.length;
  const promedio = cantidad ? lista.reduce((total, p) => total + p.precio.monto, 0) / cantidad : 0;
  const ultimos = [...lista].reverse().slice(0, 4);

  const pasos: { hecho: boolean; titulo: string; detalle: string; accion?: { a: string; texto: string } }[] = [
    {
      hecho: cantidad > 0,
      titulo: 'Cargá tu primer producto',
      detalle: 'Con nombre y precio ya aparece en tu tienda.',
      accion: { a: '/panel/productos/nuevo', texto: 'Cargar producto' },
    },
    {
      hecho: compartio,
      titulo: 'Compartí tu tienda',
      detalle: 'Copiá el enlace y mandáselo a tus clientes.',
    },
    {
      hecho: false,
      titulo: 'Recibí tu primer pedido',
      detalle: 'Cuando alguien compre, lo vas a ver en Pedidos.',
    },
  ];
  const completados = pasos.filter((p) => p.hecho).length;

  return (
    <>
      <EncabezadoPagina titulo={`Hola, ${sesion.nombre}`} descripcion={`Esto es lo que pasa hoy en ${tienda.nombre}.`} />

      {productos.estado === 'error' && <AvisoError problema={productos.problema} onReintentar={recargarProductos} />}

      <div className="metricas">
        <Metrica icono="paquete" etiqueta="Productos publicados" cargando={productos.estado === 'cargando'} valor={String(cantidad)} />
        <Metrica icono="pedidos" etiqueta="Pedidos" valor="0" nota="Todavía no hay pedidos" />
        <Metrica
          icono="etiqueta"
          etiqueta="Precio promedio"
          cargando={productos.estado === 'cargando'}
          valor={cantidad ? formatearMonto(Math.round(promedio)) : '—'}
        />
      </div>

      <div className="grilla-panel">
        <section className="tarjeta">
          <div className="tarjeta-encabezado">
            <h2 className="tarjeta-titulo">Primeros pasos</h2>
            <span className="texto-suave">
              {completados} de {pasos.length}
            </span>
          </div>
          <div className="progreso" aria-hidden="true">
            <span style={{ width: `${(completados / pasos.length) * 100}%` }} />
          </div>
          <ol className="pasos">
            {pasos.map((paso) => (
              <li key={paso.titulo} className={paso.hecho ? 'paso-hecho' : ''}>
                <span className="paso-marca">{paso.hecho && <Icono nombre="check" medida={14} />}</span>
                <div>
                  <strong>{paso.titulo}</strong>
                  <span>{paso.detalle}</span>
                </div>
                {!paso.hecho && paso.accion && (
                  <Link to={paso.accion.a} className="boton boton-secundario boton-chico">
                    {paso.accion.texto}
                  </Link>
                )}
              </li>
            ))}
          </ol>
          <EnlaceTienda url={tienda.url} onCopiado={() => setCompartio(true)} />
        </section>

        <section className="tarjeta">
          <div className="tarjeta-encabezado">
            <h2 className="tarjeta-titulo">Últimos productos</h2>
            {cantidad > 0 && (
              <Link to="/panel/productos" className="enlace-suave">
                Ver todos
              </Link>
            )}
          </div>
          {productos.estado === 'cargando' && (
            <div className="lista-esqueleto">
              <Esqueleto className="esqueleto-linea" />
              <Esqueleto className="esqueleto-linea" />
              <Esqueleto className="esqueleto-linea" />
            </div>
          )}
          {productos.estado === 'listo' && cantidad === 0 && (
            <p className="texto-suave">Todavía no cargaste productos.</p>
          )}
          {ultimos.length > 0 && (
            <ul className="lista-productos-mini">
              {ultimos.map((p) => (
                <li key={p.id}>
                  <ImagenProducto id={p.id} nombre={p.nombre} />
                  <span className="lista-productos-mini-nombre">{p.nombre}</span>
                  <span>{formatearPrecio(p.precio)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

interface PropsMetrica {
  icono: NombreIcono;
  etiqueta: string;
  valor: string;
  nota?: string;
  cargando?: boolean;
}

function Metrica({ icono, etiqueta, valor, nota, cargando }: PropsMetrica) {
  return (
    <div className="tarjeta metrica">
      <span className="metrica-icono">
        <Icono nombre={icono} medida={20} />
      </span>
      <span className="metrica-etiqueta">{etiqueta}</span>
      {cargando ? <span className="esqueleto esqueleto-metrica" /> : <strong className="metrica-valor">{valor}</strong>}
      {nota && <span className="metrica-nota">{nota}</span>}
    </div>
  );
}
