/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // APEX Racing Palette - Pit Wall Monitor aesthetic
        'apex': {
          'void': '#050507',
          'carbon': '#0C0C0E',
          'graphite': '#141418',
          'steel': '#1E1E24',
          'chrome': '#2A2A32',
          'red': '#FF0A0A',
          'red-dim': '#CC0808',
          'orange': '#FF6B00',
          'yellow': '#FFD600',
          'green': '#00FF6A',
          'cyan': '#00E5FF',
          'blue': '#0066FF',
        },
        // Legacy F1 colors for compatibility
        'f1-red': '#FF0A0A',
        'f1-black': '#050507',
        'f1-dark': '#0C0C0E',
        'f1-darker': '#050507',
        'f1-gray': '#2A2A32',
        'f1-light': '#FFFFFF',
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
        'tyre-medium': '#FFD600',
        'tyre-hard': '#FFFFFF',
        'tyre-intermediate': '#00FF6A',
        'tyre-wet': '#00E5FF',
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'monospace'],
        'headline': ['Bebas Neue', 'sans-serif'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'reveal': 'reveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'scan': 'scan 3s ease-in-out infinite',
        'ticker': 'ticker 0.3s steps(10) forwards',
      },
      keyframes: {
        'reveal': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'scan': {
          '0%': { left: '-50%' },
          '100%': { left: '150%' },
        },
        'ticker': {
          'from': { opacity: '0.5' },
          'to': { opacity: '1' },
        },
      },
      boxShadow: {
        'glow-red': '0 0 40px rgba(255, 10, 10, 0.4)',
        'glow-cyan': '0 0 30px rgba(0, 229, 255, 0.3)',
        'glow-green': '0 0 30px rgba(0, 255, 106, 0.3)',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '4px',
      },
    },
  },
  plugins: [],
}
