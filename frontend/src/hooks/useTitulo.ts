import { useEffect } from 'react';

/** Título de la pestaña del navegador. */
export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = titulo;
  }, [titulo]);
}
