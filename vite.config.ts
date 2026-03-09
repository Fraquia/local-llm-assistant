import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const certsDir = resolve(__dirname, 'certs');
const hasCerts = existsSync(resolve(certsDir, 'localhost.key'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    ...(hasCerts
      ? {
          https: {
            key: readFileSync(resolve(certsDir, 'localhost.key')),
            cert: readFileSync(resolve(certsDir, 'localhost.crt')),
          },
        }
      : {}),
    port: 3000,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, 'taskpane.html'),
      },
    },
  },
});
