import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Rutas relativas: la misma compilación funciona en Firebase Hosting y en GitHub Pages
  // (https://usuario.github.io/bitacora/) sin tocar nada.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Recharts en un archivo aparte (Firebase ya se carga bajo demanda): primera carga más ligera.
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
});
