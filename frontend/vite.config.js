import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward backend API routes to the FastAPI backend during dev.
      '/api': 'http://localhost:8000',
      '/twin': 'http://localhost:8000',
      '/disruption': 'http://localhost:8000',
      '/simulate': 'http://localhost:8000',
      '/events': 'http://localhost:8000',
      '/reset': 'http://localhost:8000',
      '/demo': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/accessibility': 'http://localhost:8000',
      '/impact': 'http://localhost:8000',
      '/depletion': 'http://localhost:8000',
      '/priority': 'http://localhost:8000',
    },
  },
})
