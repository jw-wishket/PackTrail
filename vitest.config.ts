import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
