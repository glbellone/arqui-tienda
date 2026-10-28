import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { iniciarAuth } from './auth';
import { ProveedorToasts } from './componentes/Toasts';
import Plataforma from './plataforma/Plataforma';
import { sitioActual } from './sitio';
import Tienda from './tienda/Tienda';
import './estilos/base.css';
import './estilos/tienda.css';
import './estilos/panel.css';
import './estilos/plataforma.css';

// Un mismo build sirve la plataforma y todas las tiendas: cuál se muestra depende del host (ADR-011).
// Keycloak se inicializa una sola vez, antes de renderizar. Si falla, se sigue sin sesión.
iniciarAuth()
  .catch((error) => console.error('No se pudo recuperar la sesión', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <ProveedorToasts>{sitioActual() === 'tienda' ? <Tienda /> : <Plataforma />}</ProveedorToasts>
        </BrowserRouter>
      </StrictMode>,
    );
  });
