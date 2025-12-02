/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0d12',
          secondary: '#16161d',
          tertiary: '#1e1e28',
          elevated: '#282833',
        },
        text: {
          primary: '#f0f0f5',
          secondary: '#9898a6',
          muted: '#5c5c6e',
        },
        accent: {
          primary: '#6366f1',
          glow: 'rgba(99, 102, 241, 0.4)',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          medium: 'rgba(255, 255, 255, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
