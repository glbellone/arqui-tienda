import type { CSSProperties } from 'react';
import Icono from '../componentes/Icono';
import Monograma from '../componentes/Monograma';
import { useTitulo } from '../hooks/useTitulo';
import EncabezadoPagina from './Encabezado';
import EnlaceTienda from './EnlaceTienda';
import type { ContextoPanel } from './Panel';

/** Datos de la tienda y del plan contratado. */
export default function MiTienda({ tienda }: ContextoPanel) {
  useTitulo(`Mi tienda · ${tienda.nombre}`);
  const premium = tienda.plan === 'Premium';

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
          <p className="plan-nombre">Plan {tienda.plan}</p>
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
          {!premium && <p className="texto-suave">¿Tu tienda crece? Con el plan Premium tenés infraestructura dedicada.</p>}
        </section>
      </div>
    </>
  );
}
