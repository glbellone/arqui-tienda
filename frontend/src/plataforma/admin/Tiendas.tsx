import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { admin, aProblema, type TiendaAdmin } from '../../api';
import AvisoError from '../../componentes/AvisoError';
import { Esqueleto } from '../../componentes/Esqueleto';
import EstadoVacio from '../../componentes/EstadoVacio';
import Icono from '../../componentes/Icono';
import Monograma from '../../componentes/Monograma';
import { useToast } from '../../componentes/Toasts';
import { plural, sinProtocolo } from '../../formato';
import { useCarga } from '../../hooks/useCarga';
import { useTitulo } from '../../hooks/useTitulo';
import EncabezadoPagina from '../../panel/Encabezado';
import { NOMBRE_PLATAFORMA } from '../marca';

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' });

/** Todas las tiendas de la plataforma, con su plan, su celda y la opción de darlas de baja (ADR-012). */
export default function Tiendas() {
  useTitulo(`Tiendas · ${NOMBRE_PLATAFORMA}`);
  const [carga, recargar] = useCarga(() => admin.tiendas(), []);
  const total = carga.estado === 'listo' ? carga.datos.length : 0;
  const nueva = (
    <Link to="/admin/tiendas/nueva" className="boton">
      <Icono nombre="mas" medida={16} />
      Nueva tienda
    </Link>
  );

  return (
    <>
      <EncabezadoPagina
        titulo="Tiendas"
        descripcion={carga.estado === 'listo' ? plural(total, 'tienda en la plataforma', 'tiendas en la plataforma') : 'Las tiendas de la plataforma.'}
        acciones={nueva}
      />

      {carga.estado === 'error' && <AvisoError problema={carga.problema} onReintentar={recargar} />}

      {carga.estado === 'listo' && total === 0 ? (
        <div className="tarjeta">
          <EstadoVacio icono="tienda" titulo="Todavía no hay tiendas" acciones={nueva}>
            Dá de alta la primera: se crea en la celda compartida, con su dueño listo para ingresar.
          </EstadoVacio>
        </div>
      ) : (
        <div className="tarjeta tarjeta-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Tienda</th>
                <th scope="col">Plan</th>
                <th scope="col">Celda</th>
                <th scope="col">Alta</th>
                <th scope="col">
                  <span className="solo-lectores">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {carga.estado === 'cargando' &&
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <Esqueleto className="esqueleto-linea" />
                    </td>
                  </tr>
                ))}
              {carga.estado === 'listo' && carga.datos.map((t) => <FilaTienda key={t.id} tienda={t} alDarDeBaja={recargar} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FilaTienda({ tienda, alDarDeBaja }: { tienda: TiendaAdmin; alDarDeBaja: () => void }) {
  const toast = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  async function darDeBaja() {
    setBorrando(true);
    try {
      await admin.darDeBaja(tienda.id);
      toast({ tipo: 'exito', titulo: 'Tienda dada de baja', detalle: `${tienda.nombre} ya no está publicada.` });
      alDarDeBaja();
    } catch (error) {
      toast({ tipo: 'error', titulo: 'No se pudo dar de baja', detalle: aProblema(error).detail });
      setBorrando(false);
      setConfirmando(false);
    }
  }

  return (
    <tr>
      <td>
        <div className="celda-producto" style={{ '--acento': tienda.color } as CSSProperties}>
          <Monograma nombre={tienda.nombre} />
          <div className="celda-cliente">
            <strong>{tienda.nombre}</strong>
            <span>{sinProtocolo(tienda.url)}</span>
          </div>
        </div>
      </td>
      <td>
        {tienda.plan === 'Premium' ? (
          <span className="insignia insignia-premium">
            <Icono nombre="corona" medida={13} />
            Premium
          </span>
        ) : (
          <span className="insignia">Estándar</span>
        )}
        {tienda.estado === 'mudandose' && <span className="insignia insignia-aviso">Mudándose</span>}
      </td>
      <td className="texto-suave texto-mono sin-cortes">{tienda.celda}</td>
      <td className="texto-suave sin-cortes">{fecha.format(new Date(tienda.creadaEn))}</td>
      <td className="alinear-derecha">
        {confirmando ? (
          <span className="confirmacion-fila">
            <span className="texto-suave">¿Dar de baja?</span>
            <button type="button" className="boton boton-peligro boton-chico" onClick={darDeBaja} disabled={borrando}>
              {borrando ? 'Borrando…' : 'Sí'}
            </button>
            <button type="button" className="boton boton-fantasma boton-chico" onClick={() => setConfirmando(false)} disabled={borrando}>
              No
            </button>
          </span>
        ) : (
          <span className="confirmacion-fila">
            <a href={tienda.url} target="_blank" rel="noreferrer" className="boton-icono" aria-label={`Abrir ${tienda.nombre}`} title="Abrir la tienda">
              <Icono nombre="externo" medida={18} />
            </a>
            <button
              type="button"
              className="boton-icono"
              onClick={() => setConfirmando(true)}
              aria-label={`Dar de baja ${tienda.nombre}`}
              title="Dar de baja"
              disabled={tienda.estado !== 'activa'}
            >
              <Icono nombre="basura" medida={18} />
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
