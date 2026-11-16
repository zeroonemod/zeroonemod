/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          400: '#F04A59',
          500: '#E11D2E',
          600: '#C2182A',
          700: '#9F1322',
        },
        canvas: '#0A0A0A',
        surface: {
          DEFAULT: '#141414',
          raised: '#1A1A1A',
          sunken: '#0F0F0F',
        },
      },
    },
  },
  plugins: [],
};
