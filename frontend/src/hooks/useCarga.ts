import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { aProblema, type Problema } from '../api';

export type Carga<T> =
  | { estado: 'cargando' }
  | { estado: 'listo'; datos: T }
  | { estado: 'error'; problema: Problema };

/**
 * Carga datos de la API y expone el estado (cargando, listo o error) y una función para recargar.
 * Si el componente cambia de dependencias o se desmonta, descarta la respuesta vieja.
 */
export function useCarga<T>(cargar: () => Promise<T>, deps: DependencyList): [Carga<T>, () => void] {
  const [carga, setCarga] = useState<Carga<T>>({ estado: 'cargando' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => vigente && setCarga({ estado: 'listo', datos }))
      .catch((error) => vigente && setCarga({ estado: 'error', problema: aProblema(error) }));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return [carga, recargar];
}
