import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Base path: '/' for Vercel and local dev, '/chord-wheel-writer/' for GitHub Pages
  // Vercel sets VERCEL=1 env variable, GitHub Actions doesn't
  base: process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/chord-wheel-writer/' : '/'),
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
