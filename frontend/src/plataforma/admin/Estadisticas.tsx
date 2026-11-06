import { admin, buscarTienda, type EstadisticaTienda } from '../../api';
import AvisoError from '../../componentes/AvisoError';
import { Esqueleto } from '../../componentes/Esqueleto';
import EstadoVacio from '../../componentes/EstadoVacio';
import Icono, { type NombreIcono } from '../../componentes/Icono';
import { formatearMonto, plural } from '../../formato';
import { useCarga } from '../../hooks/useCarga';
import { useTitulo } from '../../hooks/useTitulo';
import EncabezadoPagina from '../../panel/Encabezado';
import { NOMBRE_PLATAFORMA } from '../marca';

type FilaEstadistica = EstadisticaTienda & { nombre: string };

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/** Estadísticas de toda la plataforma (ADR-006). */
export default function Estadisticas() {
  useTitulo(`Estadísticas · ${NOMBRE_PLATAFORMA}`);
  const [carga, recargar] = useCarga<FilaEstadistica[]>(async () => {
    const filas = await admin.estadisticas();
    // Analítica solo conoce el id de cada tienda: el nombre sale de su perfil público.
    const nombres = await Promise.all(
      filas.map((f) =>
        buscarTienda(f.tiendaId)
          .then((t) => t.nombre)
          .catch(() => f.tiendaId),
      ),
    );
    return filas.map((f, i) => ({ ...f, nombre: nombres[i] ?? f.tiendaId }));
  }, []);

  const filas = carga.estado === 'listo' ? carga.datos : [];
  const productos = filas.reduce((total, f) => total + f.productos, 0);
  const pedidos = filas.reduce((total, f) => total + f.pedidosConfirmados, 0);
  const ventas = filas.reduce((total, f) => total + f.ventasCentavos, 0);

  return (
    <>
      <EncabezadoPagina
        titulo="Estadísticas"
        descripcion="Totales por tienda, armados con los eventos que publica cada tienda. Pueden tardar unos segundos en actualizarse."
        acciones={
          <button type="button" className="boton boton-secundario" onClick={recargar}>
            Actualizar
          </button>
        }
      />

      {carga.estado === 'error' && <AvisoError problema={carga.problema} onReintentar={recargar} />}

      <div className="metricas">
        <Metrica icono="tienda" etiqueta="Tiendas con actividad" valor={String(filas.length)} cargando={carga.estado === 'cargando'} />
        <Metrica icono="paquete" etiqueta="Productos publicados" valor={String(productos)} cargando={carga.estado === 'cargando'} />
        <Metrica
          icono="pedidos"
          etiqueta="Ventas"
          valor={formatearMonto(ventas / 100)}
          nota={plural(pedidos, 'pedido confirmado', 'pedidos confirmados')}
          cargando={carga.estado === 'cargando'}
        />
      </div>

      {carga.estado === 'listo' && filas.length === 0 ? (
        <div className="tarjeta">
          <EstadoVacio icono="grafico" titulo="Todavía no hay actividad">
            Cuando las tiendas carguen productos o reciban pedidos, los totales van a aparecer acá.
          </EstadoVacio>
        </div>
      ) : (
        <div className="tarjeta tarjeta-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Tienda</th>
                <th scope="col" className="alinear-derecha">
                  Productos
                </th>
                <th scope="col" className="alinear-derecha">
                  Pedidos
                </th>
                <th scope="col" className="alinear-derecha">
                  Ventas
                </th>
                <th scope="col" className="alinear-derecha">
                  Actualizado
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
              {filas.map((f) => (
                <tr key={f.tiendaId}>
                  <td>
                    <strong>{f.nombre}</strong>
                    {f.nombre !== f.tiendaId && <span className="texto-suave texto-mono"> {f.tiendaId}</span>}
                  </td>
                  <td className="alinear-derecha">{f.productos}</td>
                  <td className="alinear-derecha">{f.pedidosConfirmados}</td>
                  <td className="alinear-derecha">{formatearMonto(f.ventasCentavos / 100)}</td>
                  <td className="alinear-derecha texto-suave">{fecha.format(new Date(f.actualizadoEn))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

interface PropsMetrica {
  icono: NombreIcono;
  etiqueta: string;
  valor: string;
  nota?: string;
  cargando: boolean;
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
