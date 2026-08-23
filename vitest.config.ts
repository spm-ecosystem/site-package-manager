import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'src/content/**/*.test.ts', 'src/content/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'src/components'],
  },
});
