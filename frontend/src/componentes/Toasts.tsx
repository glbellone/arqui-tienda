import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import Icono from './Icono';

type TipoToast = 'exito' | 'error' | 'info';

interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  detalle?: string;
}

type Mostrar = (toast: Omit<Toast, 'id'>) => void;

const Contexto = createContext<Mostrar>(() => undefined);

/** Avisos breves que aparecen abajo a la derecha y se van solos. */
export function ProveedorToasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const siguiente = useRef(1);

  const cerrar = useCallback((id: number) => setToasts((lista) => lista.filter((t) => t.id !== id)), []);

  const mostrar = useCallback<Mostrar>(
    (toast) => {
      const id = siguiente.current++;
      setToasts((lista) => [...lista.slice(-2), { ...toast, id }]);
      window.setTimeout(() => cerrar(id), 4500);
    },
    [cerrar],
  );

  const valor = useMemo(() => mostrar, [mostrar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="toasts" role="region" aria-label="Notificaciones">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`} role={t.tipo === 'error' ? 'alert' : 'status'}>
            <span className="toast-icono">
              <Icono nombre={t.tipo === 'error' ? 'alerta' : 'check'} medida={18} />
            </span>
            <div className="toast-texto">
              <strong>{t.titulo}</strong>
              {t.detalle && <span>{t.detalle}</span>}
            </div>
            <button type="button" className="boton-icono toast-cerrar" onClick={() => cerrar(t.id)} aria-label="Cerrar aviso">
              <Icono nombre="cerrar" medida={16} />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export const useToast = () => useContext(Contexto);
