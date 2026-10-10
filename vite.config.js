import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        flightDesk: resolve(process.cwd(), 'flight-desk.html'),
      },
    },
  },
});
