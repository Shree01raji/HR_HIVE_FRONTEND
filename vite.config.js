import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api/ws': {
        target: 'ws://72.61.172.7:8000',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ws/, '/ws'),
      },
      '/api': {
        // Proxy API calls to the deployed backend to avoid CORS in local dev
        target: 'https://hive.klareit.com',
        changeOrigin: true,
        secure: false,
        // Keep /api prefix to match production setup
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  }
});
