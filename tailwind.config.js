/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cine: {
          dark: '#0c0d10',
          panel: '#15171e',
          card: '#1c1f28',
          border: '#2a2e3b',
          accent: '#e5a93c', // Warm amber / golden ratio
          accentGreen: '#4ade80',
          accentBlue: '#38bdf8',
          accentRed: '#ef4444',
          subtle: '#8e96a4',
        }
      },
      fontFamily: {
        // UI labels and readouts use the clean system sans (Roboto / OPPO Sans / SF) with tabular figures so numbers
        // stay aligned. A true monospace made the app look like a developer console.
        mono: ['system-ui', '-apple-system', 'Roboto', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
