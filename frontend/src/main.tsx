import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { iniciarAuth } from './auth';
import { sitioActual } from './sitio';
import Panel from './sitios/Panel';
import Plataforma from './sitios/Plataforma';
import Vitrina from './sitios/Vitrina';
import './estilos.css';

function render(contenido: ReactNode) {
  createRoot(document.getElementById('root')!).render(<StrictMode>{contenido}</StrictMode>);
}

// Un mismo build sirve los tres sitios: cuál se muestra depende del host (ADR-011).
const sitio = sitioActual();

if (sitio === 'tienda') {
  // La vitrina es pública: no inicia sesión ni conoce otras tiendas.
  render(<Vitrina />);
} else if (sitio === 'panel') {
  // Keycloak se inicializa una sola vez, antes de renderizar. Si no responde, el panel lo avisa.
  iniciarAuth()
    .catch((error) => console.error('No se pudo inicializar Keycloak', error))
    .finally(() => render(<Panel />));
} else {
  render(<Plataforma />);
}
