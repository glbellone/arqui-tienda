import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { aProblema, tiendaActual, type PlanTienda } from '../api';
import AvisoError from '../componentes/AvisoError';
import Icono from '../componentes/Icono';
import Monograma from '../componentes/Monograma';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../hooks/useCarga';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import EnlaceTienda from './EnlaceTienda';
import type { ContextoPanel } from './Panel';

/** Datos de la tienda y del plan contratado. */
export default function MiTienda({ tienda }: ContextoPanel) {
  useTitulo(`Mi tienda · ${tienda.nombre}`);
  const [plan, recargarPlan] = useCarga(() => tiendaActual.plan(), []);
  // El plan puede cambiar mientras el dueño mira la página: manda lo último que respondió la API.
  const nombrePlan = plan.estado === 'listo' ? plan.datos.plan : tienda.plan;
  const premium = nombrePlan === 'Premium';

  return (
    <>
      <EncabezadoPagina titulo="Mi tienda" descripcion="Cómo se presenta tu tienda ante tus clientes." />

      <div className="grilla-panel">
        <section className="tarjeta">
          <h2 className="tarjeta-titulo">Identidad</h2>
          <div className="identidad">
            <Monograma nombre={tienda.nombre} medida="grande" />
            <dl className="datos">
              <div>
                <dt>Nombre</dt>
                <dd>{tienda.nombre}</dd>
              </div>
              <div>
                <dt>Rubro</dt>
                <dd>{tienda.rubro}</dd>
              </div>
              <div>
                <dt>Color de la marca</dt>
                <dd className="muestra-color">
                  <span style={{ background: tienda.color } as CSSProperties} />
                  <span className="texto-mono">{tienda.color.toUpperCase()}</span>
                </dd>
              </div>
            </dl>
          </div>
          <h3 className="subtitulo-tarjeta">Dirección de tu tienda</h3>
          <EnlaceTienda url={tienda.url} />
        </section>

        <section className={`tarjeta tarjeta-plan ${premium ? 'tarjeta-plan-premium' : ''}`}>
          <div className="tarjeta-encabezado">
            <h2 className="tarjeta-titulo">Tu plan</h2>
            {premium && (
              <span className="insignia insignia-premium">
                <Icono nombre="corona" medida={13} />
                Premium
              </span>
            )}
          </div>
          <p className="plan-nombre">Plan {nombrePlan}</p>
          <ul className="plan-beneficios">
            <li>
              <Icono nombre="check" medida={16} />
              Tienda online con dirección propia
            </li>
            <li>
              <Icono nombre="check" medida={16} />
              Productos ilimitados
            </li>
            {premium ? (
              <>
                <li>
                  <Icono nombre="check" medida={16} />
                  Infraestructura dedicada: el tráfico de otras tiendas no afecta la tuya
                </li>
                <li>
                  <Icono nombre="check" medida={16} />
                  Datos guardados por separado
                </li>
              </>
            ) : (
              <li>
                <Icono nombre="check" medida={16} />
                Infraestructura compartida y optimizada
              </li>
            )}
          </ul>
          {plan.estado === 'error' && <AvisoError problema={plan.problema} onReintentar={recargarPlan} />}
          {plan.estado === 'listo' && <CambioDePlan plan={plan.datos} recargar={recargarPlan} />}
        </section>
      </div>
    </>
  );
}

/** Cada cuánto se consulta el estado mientras la solicitud está abierta. */
const CONSULTA_MS = 3000;

/** Pasar a Premium o volver a Estándar, en lenguaje de negocio: el dueño no ve cómo se hace, solo en qué anda. */
function CambioDePlan({ plan, recargar }: { plan: PlanTienda; recargar: () => void }) {
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const solicitud = plan.solicitud;
  const estado = solicitud?.estado;
  const abierta = estado === 'pendiente' || estado === 'en-curso';
  const aPremium = solicitud?.plan === 'Premium';

  // Mientras la solicitud está abierta se consulta seguido, para enterarse de la aprobación y del final.
  useEffect(() => {
    if (!abierta) return;
    const intervalo = window.setInterval(recargar, CONSULTA_MS);
    return () => window.clearInterval(intervalo);
  }, [abierta, recargar]);

  // Si el cambio termina con la página abierta, se avisa.
  const anterior = useRef(estado);
  useEffect(() => {
    if (anterior.current === 'en-curso' && estado === 'completada') {
      toast(
        aPremium
          ? { tipo: 'exito', titulo: '¡Tu tienda ya es Premium!', detalle: 'Ya tenés infraestructura dedicada.' }
          : { tipo: 'exito', titulo: 'Tu tienda volvió al plan Estándar', detalle: 'Sigue online con todos sus productos y pedidos.' },
      );
    }
    anterior.current = estado;
  }, [estado, aPremium, toast]);

  async function pedir(accion: () => Promise<unknown>) {
    setEnviando(true);
    try {
      await accion();
      toast({ tipo: 'exito', titulo: 'Solicitud enviada', detalle: 'Te avisamos acá cuando esté aprobada.' });
      setConfirmando(false);
      recargar();
    } catch (error) {
      toast({ tipo: 'error', titulo: 'No se pudo enviar la solicitud', detalle: aProblema(error).detail });
    } finally {
      setEnviando(false);
    }
  }

  if (estado === 'pendiente') {
    return (
      <Aviso titulo="Solicitud pendiente de aprobación">
        {aPremium
          ? 'Recibimos tu pedido para pasar a Premium. Lo estamos revisando: apenas lo aprobemos, empezamos a preparar tu tienda.'
          : 'Recibimos tu pedido para volver al plan Estándar. Lo estamos revisando: mientras tanto seguís con Premium.'}
      </Aviso>
    );
  }

  if (estado === 'en-curso') {
    return (
      <Aviso titulo={aPremium ? 'Estamos preparando tu tienda Premium' : 'Estamos pasando tu tienda al plan Estándar'}>
        Tarda unos minutos. Tu tienda sigue online; durante un momento no vas a poder cargar cambios ni recibir pedidos nuevos.
      </Aviso>
    );
  }

  // Una solicitud rechazada o fallida solo importa si pedía cambiar al plan que todavía no tiene.
  const pendienteDeCambio = solicitud && solicitud.plan !== plan.plan;
  const avisos = pendienteDeCambio && (
    <>
      {estado === 'rechazada' && (
        <Aviso titulo="Tu última solicitud no fue aprobada">Si querés, podés volver a pedir el cambio de plan.</Aviso>
      )}
      {estado === 'fallida' && (
        <Aviso titulo={aPremium ? 'No pudimos completar el pase a Premium' : 'No pudimos completar el cambio al plan Estándar'}>
          {`Tu tienda sigue funcionando con el plan ${plan.plan}, sin cambios. Podés volver a pedirlo.`}
        </Aviso>
      )}
    </>
  );

  if (plan.plan === 'Estándar') {
    return (
      <>
        {avisos}
        <p className="texto-suave">¿Tu tienda crece? Con el plan Premium tenés infraestructura dedicada.</p>
        <button type="button" className="boton" onClick={() => pedir(tiendaActual.pedirPremium)} disabled={enviando}>
          <Icono nombre="corona" medida={16} />
          {enviando ? 'Enviando…' : 'Pasar a Premium'}
        </button>
      </>
    );
  }

  return (
    <>
      {avisos}
      {confirmando ? (
        <div className="confirmacion-plan">
          <p className="texto-suave">
            Tu tienda deja de tener infraestructura dedicada y pasa a la compartida. Tus productos y pedidos se mantienen. ¿Querés pedirlo?
          </p>
          <span className="confirmacion-fila">
            <button type="button" className="boton boton-chico" onClick={() => pedir(tiendaActual.volverAEstandar)} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Sí, volver a Estándar'}
            </button>
            <button type="button" className="boton boton-fantasma boton-chico" onClick={() => setConfirmando(false)} disabled={enviando}>
              No
            </button>
          </span>
        </div>
      ) : (
        <>
          <p className="texto-suave">¿Ya no necesitás infraestructura dedicada? Podés volver al plan Estándar.</p>
          <button type="button" className="boton boton-secundario" onClick={() => setConfirmando(true)}>
            Volver al plan Estándar
          </button>
        </>
      )}
    </>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: string }) {
  return (
    <div className="aviso aviso-info" role="status">
      <Icono nombre="alerta" medida={20} />
      <div className="aviso-texto">
        <strong>{titulo}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
