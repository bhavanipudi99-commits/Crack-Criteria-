/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clinical: {
          blue: '#2563EB',
          green: '#10B981',
          crimson: '#EF4444',
          gold: '#F59E0B',
          slate: '#F8FAFC',
          text: '#475569',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
