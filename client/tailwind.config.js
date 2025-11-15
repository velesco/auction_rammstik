/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b1020',
        card: '#111827',
        muted: '#9ca3af',
        accent: '#22c55e',
        danger: '#ef4444',
        warn: '#f59e0b',
      },
    },
  },
  plugins: [],
}
