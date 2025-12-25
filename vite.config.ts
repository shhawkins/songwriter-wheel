import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Songwriter Wheel',
        short_name: 'Songwriter Wheel',
        description: 'Interactive chord wheel for songwriting and music theory',
        theme_color: '#16161d',
        background_color: '#16161d',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3000000 // Increase limit for large chunks if needed
      }
    })
  ],

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
