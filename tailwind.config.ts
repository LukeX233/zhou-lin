import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FDFAF5',
          100: '#FAF7F0',
          200: '#F5EDE0',
          300: '#EDD8C0',
          400: '#DFC4A0',
        },
        brown: {
          50:  '#F5EDE6',
          100: '#E8D0C0',
          200: '#C8A080',
          300: '#A07050',
          400: '#7A4A30',
          500: '#5C3520',
          600: '#4A2812',
          700: '#3A1E0A',
          800: '#2C1507',
          900: '#1C0A04',
        },
        gold: {
          300: '#F0C875',
          400: '#E8A940',
          500: '#C17F24',
          600: '#A06818',
          700: '#7A4E10',
        },
        matcha: {
          400: '#8BA060',
          500: '#6B7C45',
          600: '#516030',
        },
        terra: {
          400: '#C8614A',
          500: '#A84832',
          600: '#8B3422',
        },
      },
      fontFamily: {
        serif:    ['var(--font-playfair)', 'Noto Serif SC', 'serif'],
        sans:     ['var(--font-dm-sans)',  'Noto Sans SC',  'sans-serif'],
        display:  ['var(--font-playfair)', 'serif'],
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up':   'fadeUp 0.6s ease forwards',
        'fade-in':   'fadeIn 0.4s ease forwards',
        'shimmer':   'shimmer 1.8s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
