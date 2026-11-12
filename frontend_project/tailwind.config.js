/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Artistry dark plum + black base
        ink: {
          950: '#0D0A10', // page background
          900: '#100C15',
          850: '#14101B',
          800: '#17121C', // card / surface
          750: '#1C1523',
          700: '#211827', // surface 2
          600: '#2A2034',
          500: '#382C44',
          400: '#4A3D5C',
          300: '#6B5E7E',
          200: '#A9A1AE', // secondary text
          100: '#CFC9D6',
          50: '#F7F3F8', // primary text
        },
        // Brand gradient stops
        brand: {
          orange: '#FF8A3D',
          pink: '#E84F9B',
          purple: '#7B45E8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Clash Display"', 'Inter', 'system-ui', 'sans-serif'],
        editorial: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(232, 79, 155, 0.35)',
        'glow-brand': '0 0 48px -8px rgba(232, 79, 155, 0.4), 0 0 24px -12px rgba(123, 69, 232, 0.3)',
        premium: '0 20px 60px -20px rgba(0, 0, 0, 0.8), 0 8px 24px -12px rgba(0, 0, 0, 0.5)',
        card: '0 8px 32px -12px rgba(0, 0, 0, 0.7), 0 2px 8px -4px rgba(0, 0, 0, 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF8A3D 0%, #E84F9B 50%, #7B45E8 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(255,138,61,0.12) 0%, rgba(232,79,155,0.12) 50%, rgba(123,69,232,0.12) 100%)',
        'radial-fade': 'radial-gradient(ellipse at top, rgba(232, 79, 155, 0.06), transparent 60%)',
        'grid-fade': 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.7' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'draw': {
          '0%': { strokeDashoffset: '120' },
          '100%': { strokeDashoffset: '0' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'logo-fade': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'gradient-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-120%) skewX(-12deg)', opacity: '0' },
          '40%': { opacity: '0.7' },
          '100%': { transform: 'translateX(220%) skewX(-12deg)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-down': 'fade-down 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'draw': 'draw 1.4s ease-out forwards',
        'spin-slow': 'spin-slow 14s linear infinite',
        'logo-fade': 'logo-fade 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'gradient-flow': 'gradient-flow 4s ease-in-out infinite',
        'sweep': 'sweep 1.8s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};
