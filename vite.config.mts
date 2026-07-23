import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      // Avoid ENOSPC on Linux workstations where editors and extensions have
      // already consumed the available inotify watcher instances.
      usePolling: true,
      interval: 300,
      ignored: ['**/api_repository/**'],
    },
    allowedHosts: ['83c8-131-196-65-242.ngrok-free.app'],
    proxy: {
      '/api': 'http://localhost:3000',
      '/mcp/': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/ready': 'http://localhost:3000',
      '/live': 'http://localhost:3000',
      '/metrics': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'monaco-editor', test: /node_modules[\\/](@monaco-editor|monaco-editor)/, priority: 3 },
            { name: 'grapesjs', test: /node_modules[\\/]grapesjs/, priority: 3 },
            { name: 'mui', test: /node_modules[\\/]@mui/, priority: 2 },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router-dom)/, priority: 2 },
            { name: 'vendor', test: /node_modules/, priority: 1 },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: false,
    exclude: ['api/**', 'node_modules/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
