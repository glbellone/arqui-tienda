import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { escucharOtrasPestanas, iniciarAuth, keycloak } from './auth';
import ErrorInesperado from './componentes/ErrorInesperado';
import { ProveedorToasts } from './componentes/Toasts';
import Plataforma from './plataforma/Plataforma';
import { sitioActual } from './sitio';
import Tienda from './tienda/Tienda';
import './estilos/base.css';
import './estilos/tienda.css';
import './estilos/panel.css';
import './estilos/plataforma.css';

// Un mismo build sirve la plataforma y todas las tiendas: cuál se muestra depende del host (ADR-011).
const raiz = createRoot(document.getElementById('root')!);

function dibujar() {
  raiz.render(
    <StrictMode>
      <ErrorInesperado>
        {/* La clave cambia con la sesión: si Keycloak respondió tarde, se vuelve a armar todo ya con el usuario. */}
        <BrowserRouter key={keycloak.authenticated ? 'con-sesion' : 'sin-sesion'}>
          <ProveedorToasts>{sitioActual() === 'tienda' ? <Tienda /> : <Plataforma />}</ProveedorToasts>
        </BrowserRouter>
      </ErrorInesperado>
    </StrictMode>,
  );
}

// Keycloak se inicializa una sola vez, antes de dibujar. Si falla, se sigue sin sesión. Si tarda, la
// página no queda en blanco: se muestra sin sesión y se vuelve a dibujar cuando Keycloak responde.
escucharOtrasPestanas();
void iniciarAuth(dibujar).then(dibujar);
