import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        devloader: resolve(__dirname, 'devloader.html'),
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});
