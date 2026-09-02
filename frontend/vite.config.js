import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward backend API requests to the FastAPI backend while allowing
      // direct browser navigation (Accept: text/html) to load the React SPA.
      '^/(api|twin|disruption|simulate|events|reset|demo|health|accessibility|impact|depletion|priority|recommend-action|scenario|ask)($|/.*)': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html'
          }
        },
      },
    },
  },
})
