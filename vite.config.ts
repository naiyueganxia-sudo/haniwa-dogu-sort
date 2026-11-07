import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  server: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
});
