import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Valores públicos: los tests no dependen del .env local (gitignored).
    env: {
      VITE_SANITY_PROJECT_ID: 'qyhogq09',
      VITE_SANITY_DATASET: 'production',
    },
  },
})
