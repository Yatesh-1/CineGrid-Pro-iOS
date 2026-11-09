/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { handleLicenseApiRequest } from './server/licenseApi.js';

function licenseApiPlugin(): Plugin {
  return {
    name: 'cinegrid-license-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleLicenseApiRequest(req, res);
          if (!handled) {
            next();
          }
        } catch (err) {
          console.error('[Vite License Plugin Error]', err);
          next(err);
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleLicenseApiRequest(req, res);
          if (!handled) {
            next();
          }
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl(), licenseApiPlugin()],
  server: {
    port: 8080,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/@capacitor')) {
            return 'vendor-capacitor';
          }
        },
      },
    },
  },
});
