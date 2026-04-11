/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    '#0D1B8E',
          'navy-dark': '#091466',
          'navy-light': '#1a2db5',
          red:     '#D32F2F',
          'red-dark': '#b71c1c',
          'red-light': '#ef5350',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8f9fc',
          tertiary: '#f1f3f9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(13,27,142,0.08), 0 1px 2px rgba(13,27,142,0.04)',
        'card-hover': '0 4px 12px rgba(13,27,142,0.12), 0 2px 4px rgba(13,27,142,0.06)',
        modal: '0 20px 60px rgba(13,27,142,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      }
    }
  },
  plugins: []
};
