import { useEffect, useState, type CSSProperties } from 'react';
import { admin, aProblema, type EstadoSolicitud, type PasoMudanza, type SolicitudAdmin } from '../../api';
import AvisoError from '../../componentes/AvisoError';
import { Esqueleto } from '../../componentes/Esqueleto';
import EstadoVacio from '../../componentes/EstadoVacio';
import Icono from '../../componentes/Icono';
import Monograma from '../../componentes/Monograma';
import { useToast } from '../../componentes/Toasts';
import { plural } from '../../formato';
import { useCarga } from '../../hooks/useCarga';
import { useTitulo } from '../../hooks/useTitulo';
import EncabezadoPagina from '../../panel/Encabezado';
import { NOMBRE_PLATAFORMA } from '../marca';

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/** Cada cuánto se consulta mientras hay alguna mudanza en curso. */
const CONSULTA_MS = 2000;

const ESTADOS: Record<EstadoSolicitud, { etiqueta: string; clase: string }> = {
  pendiente: { etiqueta: 'Pendiente', clase: 'insignia-aviso' },
  'en-curso': { etiqueta: 'En curso', clase: 'insignia-premium' },
  completada: { etiqueta: 'Completada', clase: 'insignia-exito' },
  fallida: { etiqueta: 'Fallida', clase: 'insignia-error' },
  rechazada: { etiqueta: 'Rechazada', clase: '' },
};

/** Los pasos de la mudanza (ADR-012), en orden. */
const PASOS: Record<PasoMudanza, string> = {
  'creando-celda': 'Creando la celda',
  'frenando-escrituras': 'Frenando las escrituras',
  'copiando-datos': 'Copiando los datos',
  verificando: 'Verificando la copia',
  'cambiando-ruteo': 'Cambiando el ruteo',
  'limpiando-pool': 'Limpiando la pool',
};
const ORDEN_PASOS = Object.keys(PASOS) as PasoMudanza[];

/** Solicitudes de pase a Premium: el admin las aprueba o rechaza y sigue la mudanza paso a paso. */
export default function Solicitudes() {
  useTitulo(`Solicitudes · ${NOMBRE_PLATAFORMA}`);
  const [carga, recargar] = useCarga(() => admin.solicitudes(), []);
  const solicitudes = carga.estado === 'listo' ? carga.datos : [];
  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length;
  const hayEnCurso = solicitudes.some((s) => s.estado === 'en-curso');

  useEffect(() => {
    if (!hayEnCurso) return;
    const intervalo = window.setInterval(recargar, CONSULTA_MS);
    return () => window.clearInterval(intervalo);
  }, [hayEnCurso, recargar]);

  return (
    <>
      <EncabezadoPagina
        titulo="Solicitudes"
        descripcion={
          carga.estado === 'listo'
            ? `Pases a Premium. ${plural(pendientes, 'pendiente de aprobación', 'pendientes de aprobación')}.`
            : 'Pases a Premium que pidieron los dueños.'
        }
        acciones={
          <button type="button" className="boton boton-secundario" onClick={recargar}>
            Actualizar
          </button>
        }
      />

      {carga.estado === 'error' && <AvisoError problema={carga.problema} onReintentar={recargar} />}

      {carga.estado === 'listo' && solicitudes.length === 0 ? (
        <div className="tarjeta">
          <EstadoVacio icono="corona" titulo="No hay solicitudes">
            Cuando el dueño de una tienda Estándar pida pasar a Premium, la solicitud aparece acá para aprobarla.
          </EstadoVacio>
        </div>
      ) : (
        <div className="tarjeta tarjeta-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Tienda</th>
                <th scope="col">Pedida</th>
                <th scope="col">Estado</th>
                <th scope="col">Mudanza</th>
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
              {solicitudes.map((s) => (
                <FilaSolicitud key={s.id} solicitud={s} alCambiar={recargar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FilaSolicitud({ solicitud: s, alCambiar }: { solicitud: SolicitudAdmin; alCambiar: () => void }) {
  const toast = useToast();
  const [enviando, setEnviando] = useState<'aprobar' | 'rechazar' | null>(null);
  const nombre = s.tienda?.nombre ?? s.tiendaId;
  const estado = ESTADOS[s.estado];

  async function decidir(accion: 'aprobar' | 'rechazar') {
    setEnviando(accion);
    try {
      await (accion === 'aprobar' ? admin.aprobar(s.id) : admin.rechazar(s.id));
      toast(
        accion === 'aprobar'
          ? { tipo: 'exito', titulo: 'Solicitud aprobada', detalle: `Empezó la mudanza de ${nombre} a su celda Premium.` }
          : { tipo: 'info', titulo: 'Solicitud rechazada', detalle: `${nombre} sigue con el plan Estándar.` },
      );
    } catch (error) {
      toast({ tipo: 'error', titulo: 'No se pudo completar', detalle: aProblema(error).detail });
    } finally {
      setEnviando(null);
      alCambiar();
    }
  }

  return (
    <tr>
      <td>
        <div className="celda-producto" style={{ '--acento': s.tienda?.color } as CSSProperties}>
          <Monograma nombre={nombre} />
          <div className="celda-cliente">
            <strong>{nombre}</strong>
            <span className="texto-mono">
              {s.tiendaId}
              {s.tienda && ` · ${s.tienda.celda}`}
            </span>
          </div>
        </div>
      </td>
      <td className="texto-suave sin-cortes">{fecha.format(new Date(s.creadaEn))}</td>
      <td>
        <span className={`insignia ${estado.clase}`}>{estado.etiqueta}</span>
      </td>
      <td className="texto-suave">
        <DetalleMudanza solicitud={s} />
      </td>
      <td className="alinear-derecha">
        {s.estado === 'pendiente' && (
          <span className="confirmacion-fila">
            <button type="button" className="boton boton-chico" onClick={() => decidir('aprobar')} disabled={enviando !== null}>
              <Icono nombre="check" medida={16} />
              {enviando === 'aprobar' ? 'Aprobando…' : 'Aprobar'}
            </button>
            <button
              type="button"
              className="boton boton-fantasma boton-chico"
              onClick={() => decidir('rechazar')}
              disabled={enviando !== null}
            >
              {enviando === 'rechazar' ? 'Rechazando…' : 'Rechazar'}
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

/** En curso: el paso actual (n de 6) y la celda destino. Fallida: el error. */
function DetalleMudanza({ solicitud: s }: { solicitud: SolicitudAdmin }) {
  if (s.estado === 'en-curso' && s.paso) {
    return (
      <span>
        <strong>
          {ORDEN_PASOS.indexOf(s.paso) + 1}/{ORDEN_PASOS.length} · {PASOS[s.paso]}
        </strong>
        {s.celdaDestino && <span className="texto-mono"> → {s.celdaDestino}</span>}
      </span>
    );
  }
  if (s.estado === 'completada') {
    return (
      <span>
        {s.celdaDestino && <span className="texto-mono">{s.celdaDestino}</span>}
        {s.error && <span> · {s.error}</span>}
      </span>
    );
  }
  if (s.estado === 'fallida') return <span>{s.error ?? 'Falló sin detalle'}</span>;
  return <span>—</span>;
}
