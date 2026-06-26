import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed port and serves the built assets from ../dist.
// `1420` is the Tauri convention; `clearScreen:false` keeps Rust logs visible.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
});
