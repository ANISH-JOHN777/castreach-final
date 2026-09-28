import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            if (err.code !== 'ECONNRESET') {
              console.warn('[Vite Proxy Warning]:', err.message);
            }
          });
        }
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code !== 'ECONNRESET') {
              console.warn('[Vite WS Proxy Warning]:', err.message);
            }
          });
        }
      },
    },
  },
});

