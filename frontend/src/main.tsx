import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { iniciarAuth } from './auth';
import { sitioActual } from './sitio';
import Plataforma from './sitios/Plataforma';
import Tienda from './sitios/Tienda';
import './estilos.css';

// Un mismo build sirve la plataforma y todas las tiendas: cuál se muestra depende del host (ADR-011).
// Keycloak se inicializa una sola vez, antes de renderizar. Si falla, se sigue sin sesión.
iniciarAuth()
  .catch((error) => console.error('No se pudo recuperar la sesión', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>{sitioActual() === 'tienda' ? <Tienda /> : <Plataforma />}</BrowserRouter>
      </StrictMode>,
    );
  });
