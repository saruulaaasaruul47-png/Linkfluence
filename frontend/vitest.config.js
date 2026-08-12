import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
