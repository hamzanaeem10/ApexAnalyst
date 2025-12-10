/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // F1 Racing inspired colors - modernized
        'f1-red': '#E10600',
        'f1-black': '#0D0D12',
        'f1-dark': '#151520',
        'f1-darker': '#0A0A0F',
        'f1-gray': '#2A2A35',
        'f1-light': '#F5F5F5',
        // Team colors
        'team-mercedes': '#00D2BE',
        'team-redbull': '#3671C6',
        'team-ferrari': '#E80020',
        'team-mclaren': '#FF8000',
        'team-alpine': '#FF87BC',
        'team-aston': '#229971',
        'team-williams': '#64C4FF',
        'team-haas': '#B6BABD',
        'team-kick': '#52E252',
        'team-rb': '#6692FF',
        // Tyre compound colors
        'tyre-soft': '#FF0000',
        'tyre-medium': '#FFC300',
        'tyre-hard': '#FFFFFF',
        'tyre-intermediate': '#39B54A',
        'tyre-wet': '#00AEEF',
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'gradient': 'gradient-shift 3s ease infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% center' },
          '50%': { backgroundPosition: '100% center' },
        },
      },
      boxShadow: {
        'glow-red': '0 0 40px rgba(225, 6, 0, 0.3)',
        'glow-subtle': '0 0 60px rgba(225, 6, 0, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
