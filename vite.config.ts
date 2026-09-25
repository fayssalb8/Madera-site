import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        // Split heavy vendor libraries into cacheable, parallel-downloadable
        // chunks so app-code updates don't invalidate the vendor cache.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'vendor-motion', test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: 'vendor-misc', test: /[\\/]node_modules[\\/](zustand|react-helmet-async|clsx|tailwind-merge)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    // When using `wrangler pages dev -- npm run dev`, wrangler proxies
    // /api and /uploads to the Pages Functions automatically.
    // No manual proxy configuration needed.
  },
});
