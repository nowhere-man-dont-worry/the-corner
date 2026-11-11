import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Never inline flag-icons SVGs into the CSS as data: URIs. Each flag stays
    // a separate file, so the browser fetches only the flags that render.
    assetsInlineLimit: (filePath) => (filePath.includes('flag-icons') ? false : undefined),
  },
  server: {
    port: 5173,
    open: true,
    host: true,
  },
  preview: {
    port: 4173,
  },
});
