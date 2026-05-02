import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const buildNumber = (() => {
  try { return readFileSync(resolve(__dirname, '../BUILD_NUMBER'), 'utf8').trim() }
  catch { return '0' }
})()

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
  },
  server: {
    port: 5173,
    proxy: {
      // In development, forward /api calls to the FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8374',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
