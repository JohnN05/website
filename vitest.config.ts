import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environmentMatchGlobs: [
      ['src/lib/theme.test.ts', 'happy-dom'],
      ['src/lib/contactForm.test.ts', 'happy-dom'],
    ],
  },
});
