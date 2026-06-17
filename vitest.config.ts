import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      include: [
        'src/api/**',
        'src/app/components/ui/utils.ts',
      ],
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/styles/**',
        'src/app/pages/**',
        'src/app/components/ui/**',
        'src/app/App.tsx',
        'src/app/routes.tsx',
        'src/app/components/Layout.tsx',
        'src/app/components/Sidebar.tsx',
        'src/app/components/AuthGuard.tsx',
        'src/app/components/AdminGuard.tsx',
      ],
    },
  },
})
