/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0D1B2A',
        secondary: '#F7E7B0',
        accent: '#1E5FA8',
        'accent-blue': '#0B3A63',
        'gold-DEFAULT': '#D4AF37',
        'gold-light': '#F1D27A',
        gold: '#D4AF37',
        'background-light': '#F8FAFC',
        'background-dark': '#0B1220',
        'text-light': '#0F172A',
        'text-dark': '#E2E8F0',
        'text-muted-light': '#64748B',
        'text-muted-dark': '#94A3B8',
        'heading-dark': '#F8FAFC',
        'card-light': '#FFFFFF',
        'card-dark': '#111827',
        'border-light': '#E2E8F0',
        'border-dark': '#1F2937',
        'secondary-light': '#F8F1DA',
        'secondary-dark': '#1F2937',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Merriweather', 'serif'],
        body: ['"Public Sans"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
