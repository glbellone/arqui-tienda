import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { iniciarAuth } from './auth';
import './estilos.css';

// Keycloak se inicializa una sola vez, antes de renderizar. Si no responde,
// la app arranca igual sin sesión (la vitrina es pública).
iniciarAuth()
  .catch((error) => console.error('No se pudo inicializar Keycloak', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    );
  });
