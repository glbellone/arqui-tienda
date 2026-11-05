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
          {plan.estado === 'listo' && <PasarAPremium plan={plan.datos} recargar={recargarPlan} />}
        </section>
      </div>
    </>
  );
}

/** Cada cuánto se consulta el estado mientras la solicitud está abierta. */
const CONSULTA_MS = 3000;

/** El pase a Premium, en lenguaje de negocio: el dueño no ve cómo se hace, solo en qué anda. */
function PasarAPremium({ plan, recargar }: { plan: PlanTienda; recargar: () => void }) {
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  const estado = plan.solicitud?.estado;
  const abierta = estado === 'pendiente' || estado === 'en-curso';

  // Mientras la solicitud está abierta se consulta seguido, para enterarse de la aprobación y del final.
  useEffect(() => {
    if (!abierta) return;
    const intervalo = window.setInterval(recargar, CONSULTA_MS);
    return () => window.clearInterval(intervalo);
  }, [abierta, recargar]);

  // Si el pase termina con la página abierta, se avisa.
  const anterior = useRef(estado);
  useEffect(() => {
    if (anterior.current === 'en-curso' && estado === 'completada') {
      toast({ tipo: 'exito', titulo: '¡Tu tienda ya es Premium!', detalle: 'Ya tenés infraestructura dedicada.' });
    }
    anterior.current = estado;
  }, [estado, toast]);

  async function pedir() {
    setEnviando(true);
    try {
      await tiendaActual.pedirPremium();
      toast({ tipo: 'exito', titulo: 'Solicitud enviada', detalle: 'Te avisamos acá cuando esté aprobada.' });
      recargar();
    } catch (error) {
      toast({ tipo: 'error', titulo: 'No se pudo enviar la solicitud', detalle: aProblema(error).detail });
    } finally {
      setEnviando(false);
    }
  }

  if (plan.plan === 'Premium') return null;

  if (estado === 'pendiente') {
    return (
      <Aviso titulo="Solicitud pendiente de aprobación">
        Recibimos tu pedido para pasar a Premium. Lo estamos revisando: apenas lo aprobemos, empezamos a preparar tu tienda.
      </Aviso>
    );
  }

  if (estado === 'en-curso') {
    return (
      <Aviso titulo="Estamos preparando tu tienda Premium">
        Tarda unos minutos. Tu tienda sigue online; durante un momento no vas a poder cargar cambios ni recibir pedidos nuevos.
      </Aviso>
    );
  }

  return (
    <>
      {estado === 'rechazada' && (
        <Aviso titulo="Tu última solicitud no fue aprobada">Si querés, podés volver a pedir el plan Premium.</Aviso>
      )}
      {estado === 'fallida' && (
        <Aviso titulo="No pudimos completar el pase a Premium">
          Tu tienda sigue funcionando con el plan Estándar, sin cambios. Podés volver a pedirlo.
        </Aviso>
      )}
      <p className="texto-suave">¿Tu tienda crece? Con el plan Premium tenés infraestructura dedicada.</p>
      <button type="button" className="boton" onClick={pedir} disabled={enviando}>
        <Icono nombre="corona" medida={16} />
        {enviando ? 'Enviando…' : 'Pasar a Premium'}
      </button>
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
