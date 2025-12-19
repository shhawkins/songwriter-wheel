import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


// Detect Vercel deployment - Vercel sets VERCEL=1 env variable
const isVercel = process.env.VERCEL === '1'

// https://vite.dev/config/
export default defineConfig({
  // Base path: '/' for Vercel and local dev, '/songwriter-wheel/' for GitHub Pages
  base: isVercel ? '/' : (process.env.CI ? '/songwriter-wheel/' : '/'),
  resolve: {
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  plugins: [react()],

  // Disable SPA fallback for .html files
  appType: 'spa',

  server: {
    host: true, // Listen on all addresses including LAN
    port: 5173, // Default port
    strictPort: false, // Allow using next available port if 5173 is taken
    cors: true, // Enable CORS for mobile testing
    hmr: {
      overlay: true // Show errors overlay
    }
  },

  build: {
    // Copy public folder contents to dist
    copyPublicDir: true,
  }
})
