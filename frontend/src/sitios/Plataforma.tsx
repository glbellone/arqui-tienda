import { useEffect, useState } from 'react';
import { buscarTienda } from '../api';
import { sesionActual } from '../auth';
import Sesion from '../componentes/Sesion';

/** Presentación de la plataforma. A propósito no lista tiendas: cada una se publica en su propia dirección. */
export default function Plataforma() {
  const sesion = sesionActual();
  const [urlPanel, setUrlPanel] = useState<string | null>(null);

  // Si ingresa un dueño, se le ofrece ir al panel de su tienda.
  useEffect(() => {
    if (!sesion?.roles.includes('duenio') || !sesion.tiendaId) return;
    buscarTienda(sesion.tiendaId)
      .then(({ datos }) => setUrlPanel(`${datos.url}/panel`))
      .catch(() => setUrlPanel(null));
  }, [sesion?.tiendaId]);

  return (
    <div className="marco">
      <header className="barra">
        <span className="marca">Vidriera</span>
        <Sesion sesion={sesion} />
      </header>
      <main className="contenido presentacion">
        <h1 className="titulo">Tu tienda online, con tu propia dirección</h1>
        <p className="bajada">
          Cada emprendedor publica su tienda en su subdominio, por ejemplo <code>tu-marca.localhost:5173</code>. Tus
          clientes ven solo tus productos: no hay un listado compartido con otras tiendas. Para administrarla, ingresá
          desde tu tienda y abrí el panel.
        </p>
        {urlPanel && (
          <a className="boton" href={urlPanel}>
            Ir al panel de mi tienda
          </a>
        )}
      </main>
    </div>
  );
}
