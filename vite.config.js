import { defineConfig } from 'vite';

/**
 * Vite build config for Aethoria.
 *
 * Dev server (npm run dev): serves from project root on port 8001 — identical
 * to the old `python3 -m http.server 8001`. All existing /assets/ and /src/
 * paths resolve the same way.
 *
 * Production build (npm run build): bundles src/ into dist/assets/*.js, then
 * the post-build script copies static files (assets/, manifest.json, sw.js,
 * icons/) into dist/ so the final folder is self-contained.
 *
 * Electron: production loads dist/ via a local HTTP server so absolute paths
 * like /assets/tileset.png resolve correctly.
 * Capacitor: reads dist/ after `cap sync`.
 */
export default defineConfig({
  root: '.',

  // Serve the public/ folder at root in both dev and build.
  // Contains: manifest.json, sw.js, icons/, screenshots/
  publicDir: 'public',

  resolve: {
    // Allow bare-specifier imports of three (npm) alongside the existing
    // relative-path imports throughout the codebase.
    alias: {},
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main:   'index.html',
        editor: 'aeth-ed.html',
      },
      output: {
        // Keep chunk names deterministic for the Electron packager
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  server: {
    port: 8001,
    // Required on machines with low inotify limits (see CLAUDE.md)
    watch: { usePolling: true },
  },

  preview: {
    port: 8001,
  },
});
