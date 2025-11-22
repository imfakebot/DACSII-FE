/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1089D3',
          light: '#12B1D1',
        }
      }
    }
  },
  plugins: []
};