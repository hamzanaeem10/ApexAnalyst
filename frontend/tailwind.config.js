/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // F1 Racing inspired colors
        'f1-red': '#E10600',
        'f1-black': '#15151E',
        'f1-dark': '#1E1E2E',
        'f1-gray': '#38383F',
        'f1-light': '#F5F5F5',
        // Team colors
        'team-mercedes': '#00D2BE',
        'team-redbull': '#0600EF',
        'team-ferrari': '#DC0000',
        'team-mclaren': '#FF8700',
        'team-alpine': '#0090FF',
        'team-aston': '#006F62',
        'team-williams': '#005AFF',
        'team-haas': '#FFFFFF',
        'team-alfa': '#900000',
        'team-alphatauri': '#2B4562',
        // Tyre compound colors
        'tyre-soft': '#FF0000',
        'tyre-medium': '#FFC300',
        'tyre-hard': '#FFFFFF',
        'tyre-intermediate': '#39B54A',
        'tyre-wet': '#00AEEF',
      },
      fontFamily: {
        'f1': ['Titillium Web', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}
