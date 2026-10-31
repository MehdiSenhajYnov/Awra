import { defineConfig } from 'vite';

// Relative base so the build runs from file:// (Electron/Steam) and from any itch.io sub-path.
export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
