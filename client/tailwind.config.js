/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ISO Termizy — Timurid gold + deep navy
        gold: {
          DEFAULT: '#C6A15B',
          50: '#FBF7EE', 100: '#F5ECD8', 200: '#EBDBB5',
          300: '#DCC389', 400: '#C6A15B', 500: '#B0894C',
          600: '#96723F', 700: '#775A34', 800: '#5A4527', 900: '#3D2F1B',
        },
        navy: {
          DEFAULT: '#1C2B45',
          50: '#F3F5F9', 100: '#E2E7F0', 200: '#C4CDDD',
          300: '#93A2BE', 400: '#5E7096', 500: '#3A4E76',
          600: '#28395B', 700: '#1C2B45', 800: '#141F33', 900: '#0D1522',
        },
      },
      fontFamily: {
        display: ['Marcellus', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,43,69,.04), 0 12px 28px -14px rgba(28,43,69,.14)',
        ios: '0 2px 6px rgba(28,43,69,.05), 0 18px 40px -16px rgba(28,43,69,.16)',
        glow: '0 0 0 1px rgba(198,161,91,.35), 0 8px 30px -8px rgba(198,161,91,.35)',
      },
      borderRadius: {
        '4xl': '1.75rem',
        '5xl': '2.25rem',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(.25,.1,.25,1)',
      },
    },
  },
  plugins: [],
};
