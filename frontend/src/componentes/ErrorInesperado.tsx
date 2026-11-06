import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Estado {
  error: Error | null;
}

/**
 * Si algo falla al dibujar la página, muestra un mensaje en vez de dejarla en blanco.
 * El detalle queda en la consola del navegador.
 */
export default class ErrorInesperado extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error al mostrar la página', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="pagina-mensaje">
        <h1>Algo salió mal</h1>
        <p>No pudimos mostrar esta página. Probá recargarla.</p>
        <button type="button" className="boton" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </main>
    );
  }
}
