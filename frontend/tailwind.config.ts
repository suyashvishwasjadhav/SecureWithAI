import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        card: '#111111',
        'card-hover': '#161616',
        border: '#1f1f1f',
        accent: '#6366f1',
        'accent-hover': '#4f46e5',
        danger: '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
        muted: '#6b7280'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [typography],
} satisfies Config;
