import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  css: {
    postcss: {},
  },
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
