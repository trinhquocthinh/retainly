import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['apps/web', 'apps/api/vitest.config.mts', 'apps/api/vitest.integration.config.mts'],
    coverage: {
      provider: 'v8',
      include: ['apps/*/src/features/*/domain/**', 'apps/*/src/features/*/application/**'],
      thresholds: { lines: 80 },
      reporter: ['text-summary'],
    },
  },
});
