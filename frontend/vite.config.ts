/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward /api/* to the FastAPI backend so the browser sees one origin.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  test: {
    // jsdom simulates a browser DOM in Node so components can render in tests.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
