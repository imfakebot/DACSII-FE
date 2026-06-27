/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F172A', // Slate 900
          light: '#334155',
          dark: '#020617',
          soft: '#F8FAFC', 
        },
        secondary: {
          DEFAULT: '#3B82F6', // Crisp elegant blue
          light: '#EFF6FF',
        },
        danger: {
          DEFAULT: '#EF4444', 
          light: '#FEF2F2',
        },
        warning: {
          DEFAULT: '#F59E0B', 
          light: '#FFFBEB',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          container: '#FBFBFC', // Very slight off-white
          hover: '#F1F5F9',
        },
        text: {
          primary: '#0F172A', // Slate 900
          secondary: '#64748B', // Slate 500
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'elevation-1': '0 2px 10px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
        'elevation-2': '0 10px 30px -5px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
        'elevation-3': '0 20px 40px -10px rgba(15, 23, 42, 0.08), 0 10px 20px -5px rgba(15, 23, 42, 0.04)',
      },
      transitionDuration: {
        'fast': '250ms', // Premium speed
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }
    }
  },
  plugins: []
};