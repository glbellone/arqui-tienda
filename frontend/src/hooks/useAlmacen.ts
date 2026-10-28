import { useEffect, useState } from 'react';

/**
 * Estado que se guarda en localStorage. Es por origen: cada tienda (cada subdominio) tiene el suyo,
 * así que el carrito de una tienda nunca aparece en otra.
 */
export function useAlmacen<T>(clave: string, inicial: T): [T, (valor: T | ((anterior: T) => T)) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado ? (JSON.parse(guardado) as T) : inicial;
    } catch {
      return inicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento, el estado dura hasta recargar la página.
    }
  }, [clave, valor]);

  return [valor, setValor];
}
