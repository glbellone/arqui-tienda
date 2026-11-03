import { buscarTienda, estadisticas, type EstadisticaTienda } from '../api';
import { ingresar, salir, type Sesion } from '../auth';
import AvisoError from '../componentes/AvisoError';
import { Esqueleto } from '../componentes/Esqueleto';
import EstadoVacio from '../componentes/EstadoVacio';
import Icono, { type NombreIcono } from '../componentes/Icono';
import { formatearMonto, plural } from '../formato';
import { useCarga } from '../hooks/useCarga';
import { useTitulo } from '../hooks/useTitulo';
import { NOMBRE_PLATAFORMA } from './marca';

type FilaEstadistica = EstadisticaTienda & { nombre: string };

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/** Estadísticas de toda la plataforma, solo para el administrador (ADR-006). */
export default function Estadisticas({ sesion }: { sesion: Sesion | null }) {
  useTitulo(`Estadísticas · ${NOMBRE_PLATAFORMA}`);

  if (!sesion) {
    return (
      <main className="plataforma-acceso">
        <div className="tarjeta tarjeta-acceso">
          <span className="estado-vacio-icono">
            <Icono nombre="grafico" medida={28} />
          </span>
          <h1>Estadísticas de la plataforma</h1>
          <p>Ingresá con una cuenta de administrador para verlas.</p>
          <button type="button" className="boton boton-grande boton-bloque" onClick={() => ingresar('/admin/estadisticas')}>
            Ingresar
          </button>
        </div>
      </main>
    );
  }

  if (!sesion.roles.includes('admin')) {
    return (
      <main className="plataforma-acceso">
        <div className="tarjeta tarjeta-acceso">
          <span className="estado-vacio-icono">
            <Icono nombre="candado" medida={28} />
          </span>
          <h1>No tenés acceso a las estadísticas</h1>
          <p>
            Ingresaste como <strong>{sesion.usuario}</strong>, que no es administrador de la plataforma.
          </p>
          <button type="button" className="boton boton-grande boton-bloque" onClick={() => salir('/admin/estadisticas')}>
            Ingresar con otra cuenta
          </button>
        </div>
      </main>
    );
  }

  return <Tablero />;
}

function Tablero() {
  const [carga, recargar] = useCarga<FilaEstadistica[]>(async () => {
    const filas = await estadisticas();
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
    <main className="plataforma-contenido">
      <div className="encabezado-pagina">
        <div className="encabezado-pagina-fila">
          <div>
            <h1>Estadísticas de la plataforma</h1>
            <p>Totales por tienda, armados con los eventos que publica cada tienda. Pueden tardar unos segundos en actualizarse.</p>
          </div>
          <div className="encabezado-pagina-acciones">
            <button type="button" className="boton boton-secundario" onClick={recargar}>
              Actualizar
            </button>
          </div>
        </div>
      </div>

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
    </main>
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
