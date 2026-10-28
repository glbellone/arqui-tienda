import { useEffect, useMemo, useState } from 'react';
import { buscarTienda } from '../api';
import { ingresar, salir, sesionActual } from '../auth';
import Icono, { type NombreIcono } from '../componentes/Icono';
import { useTitulo } from '../hooks/useTitulo';

/** Nombre provisorio de la plataforma. Solo aparece en esta página, que es para emprendedores. */
export const NOMBRE_PLATAFORMA = 'Tiendas online';

const BENEFICIOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: 'enlace',
    titulo: 'Tu propia dirección',
    texto: 'Tu tienda se publica en su propio subdominio, listo para compartir con tus clientes.',
  },
  {
    icono: 'candado',
    titulo: 'Solo tu tienda',
    texto: 'Tus clientes ven tus productos y nada más: no hay un listado compartido con otras tiendas.',
  },
  {
    icono: 'grafico',
    titulo: 'Crece con vos',
    texto: 'Con el plan Premium tu tienda tiene infraestructura y datos dedicados.',
  },
];

/** Página de la plataforma, para emprendedores. A propósito no lista tiendas. */
export default function Plataforma() {
  useTitulo(NOMBRE_PLATAFORMA);
  const sesion = useMemo(() => sesionActual(), []);
  const [urlPanel, setUrlPanel] = useState<string | null>(null);

  // Si ingresa un dueño, se le ofrece ir al panel de su tienda.
  useEffect(() => {
    if (!sesion?.roles.includes('duenio') || !sesion.tiendaId) return;
    buscarTienda(sesion.tiendaId)
      .then((tienda) => setUrlPanel(`${tienda.url}/panel`))
      .catch(() => setUrlPanel(null));
  }, [sesion]);

  return (
    <div className="sitio-plataforma">
      <header className="plataforma-barra">
        <span className="plataforma-marca">
          <Icono nombre="tienda" medida={22} />
          {NOMBRE_PLATAFORMA}
        </span>
        {sesion ? (
          <div className="plataforma-sesion">
            <span className="texto-suave ocultar-en-movil">{sesion.nombre}</span>
            <button type="button" className="boton boton-secundario boton-chico" onClick={() => salir()}>
              Salir
            </button>
          </div>
        ) : (
          <button type="button" className="boton boton-secundario boton-chico" onClick={() => ingresar()}>
            Ingresar
          </button>
        )}
      </header>

      <main>
        <section className="plataforma-portada">
          <p className="plataforma-antetitulo">Para emprendedores</p>
          <h1>Tu tienda online, con tu propia dirección</h1>
          <p className="plataforma-bajada">
            Cargá tus productos, compartí tu enlace y vendé. Tus clientes ven solo tu tienda.
          </p>
          {urlPanel ? (
            <a href={urlPanel} className="boton boton-grande">
              Ir al panel de mi tienda
              <Icono nombre="derecha" medida={18} />
            </a>
          ) : (
            !sesion && (
              <button type="button" className="boton boton-grande" onClick={() => ingresar()}>
                Ingresar a mi tienda
              </button>
            )
          )}
        </section>

        <section className="plataforma-beneficios" aria-label="Beneficios">
          {BENEFICIOS.map((b) => (
            <article key={b.titulo} className="tarjeta">
              <span className="metrica-icono">
                <Icono nombre={b.icono} medida={20} />
              </span>
              <h2>{b.titulo}</h2>
              <p>{b.texto}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="plataforma-pie">
        © {new Date().getFullYear()} {NOMBRE_PLATAFORMA}
      </footer>
    </div>
  );
}
