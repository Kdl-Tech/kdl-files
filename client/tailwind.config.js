/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#050810',
          900: '#080d1a',
          800: '#0d1424',
          700: '#141d35',
          600: '#1e2d4a',
          500: '#2a3d60',
        },
        brand: {
          DEFAULT: '#6366f1',
          light:   '#818cf8',
          dark:    '#4f46e5',
          glow:    'rgba(99,102,241,0.4)',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          light:   '#a78bfa',
          glow:    'rgba(139,92,246,0.4)',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          light:   '#22d3ee',
          glow:    'rgba(6,182,212,0.4)',
        },
        emerald: {
          DEFAULT: '#10b981',
          light:   '#34d399',
          glow:    'rgba(16,185,129,0.3)',
        },
        amber:  { DEFAULT: '#f59e0b', light: '#fbbf24' },
        rose:   { DEFAULT: '#f43f5e', light: '#fb7185' },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
        'gradient-dark':  'linear-gradient(180deg, #080d1a 0%, #050810 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(13,20,36,0.9) 0%, rgba(8,13,26,0.95) 100%)',
        'gradient-glow':  'radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-brand':  '0 0 30px rgba(99,102,241,0.3)',
        'glow-violet': '0 0 30px rgba(139,92,246,0.3)',
        'glow-cyan':   '0 0 30px rgba(6,182,212,0.3)',
        'glow-green':  '0 0 20px rgba(16,185,129,0.3)',
        'glow-red':    '0 0 20px rgba(244,63,94,0.3)',
        'card':        '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'card-hover':  '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':      'float 6s ease-in-out infinite',
        'slide-up':   'slide-up 0.4s ease-out',
        'fade-in':    'fade-in 0.3s ease-out',
        'shimmer':    'shimmer 2s infinite',
      },
      keyframes: {
        float:       { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'slide-up':  { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'fade-in':   { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
};
