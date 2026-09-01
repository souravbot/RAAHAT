import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward backend API routes to the FastAPI backend during dev.
      // Use explicit path regex so frontend routes like /disruptions are served as SPA.
      '^/disruption($|/.*)': 'http://localhost:8000',
      '^/(api|twin|simulate|events|reset|demo|health|accessibility|impact|depletion|priority|recommend-action|scenario|ask)($|/.*)': 'http://localhost:8000',
    },
  },
})
