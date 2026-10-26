import { urlPanel } from '../sitio';

/** Presentación de la plataforma. A propósito no lista tiendas: cada una se publica en su propia dirección. */
export default function Plataforma() {
  return (
    <div className="marco">
      <header className="barra">
        <span className="marca">Vidriera</span>
        <div className="sesion">
          <a className="boton boton-secundario" href={urlPanel()}>
            Ingresar al panel
          </a>
        </div>
      </header>
      <main className="contenido presentacion">
        <h1 className="titulo">Tu tienda online, con tu propia dirección</h1>
        <p className="bajada">
          Cada emprendedor publica su tienda en su subdominio, por ejemplo <code>tu-marca.localhost:5173</code>. Tus
          clientes ven solo tus productos: no hay un listado compartido con otras tiendas.
        </p>
        <a className="boton" href={urlPanel()}>
          Ir a mi panel
        </a>
      </main>
    </div>
  );
}
