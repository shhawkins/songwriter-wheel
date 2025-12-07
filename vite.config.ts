import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Remove base path for local development, or make it conditional for production
  base: process.env.NODE_ENV === 'production' ? '/chord-wheel-writer/' : '/',
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses including LAN
    port: 5173, // Default port
    strictPort: false, // Allow using next available port if 5173 is taken
    cors: true, // Enable CORS for mobile testing
    hmr: {
      overlay: true // Show errors overlay
    }
  },
})
