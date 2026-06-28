import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/mcp': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/ready': 'http://localhost:3000',
      '/live': 'http://localhost:3000',
      '/metrics': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: false,
    exclude: ['api/**', 'node_modules/**', '.claude/**'],
  },
})
