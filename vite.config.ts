import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-assets',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const assetsOut = resolve(__dirname, 'dist/assets');

        // Copy manifest.json
        copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'));

        // Copy icons
        const iconsOut = resolve(distDir, 'icons');
        if (!existsSync(iconsOut)) mkdirSync(iconsOut, { recursive: true });
        for (const size of ['16', '48', '128']) {
          const src = resolve(__dirname, `public/icons/icon-${size}.png`);
          if (existsSync(src)) copyFileSync(src, resolve(iconsOut, `icon-${size}.png`));
        }

        // Copy ONNX Runtime WASM + MJS glue files for browser inference WASM fallback.
        // Must keep original names (no hash) so ONNX Runtime can find them at runtime.
        const onnxDist = resolve(__dirname, 'node_modules/onnxruntime-web/dist');
        if (existsSync(onnxDist)) {
          if (!existsSync(assetsOut)) mkdirSync(assetsOut, { recursive: true });
          for (const file of readdirSync(onnxDist)) {
            if (
              file.startsWith('ort-wasm-simd-threaded') &&
              (file.endsWith('.wasm') || file.endsWith('.mjs'))
            ) {
              copyFileSync(resolve(onnxDist, file), resolve(assetsOut, file));
            }
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: '',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content-script': resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker' || chunkInfo.name === 'content-script') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
