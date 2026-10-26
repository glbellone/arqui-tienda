import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, Vite hace lo mismo que nginx: reenvía /api al gateway conservando el host,
    // que es lo que el gateway usa para saber de qué tienda es el pedido (ADR-011).
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
      },
    },
  },
});
