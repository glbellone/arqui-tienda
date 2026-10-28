import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Producto } from '../api';
import { useAlmacen } from '../hooks/useAlmacen';

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  precio: { monto: number; moneda: string };
  cantidad: number;
}

interface Carrito {
  items: ItemCarrito[];
  cantidadTotal: number;
  subtotal: number;
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  agregar: (producto: Producto, cantidad?: number) => void;
  cambiarCantidad: (productoId: string, cantidad: number) => void;
  quitar: (productoId: string) => void;
  vaciar: () => void;
}

const Contexto = createContext<Carrito | null>(null);

export const CANTIDAD_MAXIMA = 99;

/**
 * Carrito del comprador. Vive en el navegador (localStorage) y, como cada tienda es un origen
 * distinto, cada tienda tiene su propio carrito. Cuando exista el módulo Ventas, el checkout
 * lo convierte en un pedido.
 */
export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [items, setItems] = useAlmacen<ItemCarrito[]>('carrito', []);
  const [abierto, setAbierto] = useState(false);

  const agregar = useCallback(
    (producto: Producto, cantidad = 1) =>
      setItems((actuales) => {
        const existente = actuales.find((i) => i.productoId === producto.id);
        if (existente) {
          return actuales.map((i) =>
            i.productoId === producto.id ? { ...i, cantidad: Math.min(CANTIDAD_MAXIMA, i.cantidad + cantidad) } : i,
          );
        }
        return [...actuales, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad }];
      }),
    [setItems],
  );

  const cambiarCantidad = useCallback(
    (productoId: string, cantidad: number) =>
      setItems((actuales) =>
        cantidad <= 0
          ? actuales.filter((i) => i.productoId !== productoId)
          : actuales.map((i) => (i.productoId === productoId ? { ...i, cantidad: Math.min(CANTIDAD_MAXIMA, cantidad) } : i)),
      ),
    [setItems],
  );

  const quitar = useCallback(
    (productoId: string) => setItems((actuales) => actuales.filter((i) => i.productoId !== productoId)),
    [setItems],
  );

  const valor = useMemo<Carrito>(
    () => ({
      items,
      cantidadTotal: items.reduce((total, i) => total + i.cantidad, 0),
      subtotal: items.reduce((total, i) => total + i.precio.monto * i.cantidad, 0),
      abierto,
      abrir: () => setAbierto(true),
      cerrar: () => setAbierto(false),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar: () => setItems([]),
    }),
    [items, abierto, agregar, cambiarCantidad, quitar, setItems],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): Carrito {
  const carrito = useContext(Contexto);
  if (!carrito) throw new Error('useCarrito se usa dentro de ProveedorCarrito');
  return carrito;
}
