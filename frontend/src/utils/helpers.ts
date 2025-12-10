import type Plotly from 'plotly.js';

// F1 Team colors mapping
export const teamColors: Record<string, string> = {
  'Mercedes': '#00D2BE',
  'Red Bull Racing': '#0600EF',
  'Ferrari': '#DC0000',
  'McLaren': '#FF8700',
  'Alpine': '#0090FF',
  'Aston Martin': '#006F62',
  'Williams': '#005AFF',
  'Haas F1 Team': '#FFFFFF',
  'Alfa Romeo': '#900000',
  'AlphaTauri': '#2B4562',
  'RB': '#2B4562',
  'Kick Sauber': '#00E701',
};

// Driver to team mapping for 2024
export const driverTeams: Record<string, string> = {
  'VER': 'Red Bull Racing',
  'PER': 'Red Bull Racing',
  'HAM': 'Mercedes',
  'RUS': 'Mercedes',
  'LEC': 'Ferrari',
  'SAI': 'Ferrari',
  'NOR': 'McLaren',
  'PIA': 'McLaren',
  'ALO': 'Aston Martin',
  'STR': 'Aston Martin',
  'GAS': 'Alpine',
  'OCO': 'Alpine',
  'ALB': 'Williams',
  'SAR': 'Williams',
  'BOT': 'Kick Sauber',
  'ZHO': 'Kick Sauber',
  'MAG': 'Haas F1 Team',
  'HUL': 'Haas F1 Team',
  'TSU': 'RB',
  'RIC': 'RB',
  'LAW': 'RB',
};

// Get color for driver based on their team
export function getDriverColor(driverCode: string): string {
  const team = driverTeams[driverCode];
  return team ? teamColors[team] || '#888888' : '#888888';
}

// Array of distinct colors for general use
export const chartColors = [
  '#E10600', // F1 Red
  '#00D2BE', // Mercedes Teal
  '#FF8700', // McLaren Orange
  '#0600EF', // Red Bull Blue
  '#006F62', // Aston Green
  '#0090FF', // Alpine Blue
  '#FFC300', // Yellow
  '#9747FF', // Purple
  '#FF69B4', // Pink
  '#00FF00', // Lime
];

// Tyre compound colors
export const tyreColors: Record<string, string> = {
  'SOFT': '#FF0000',
  'MEDIUM': '#FFC300',
  'HARD': '#FFFFFF',
  'INTERMEDIATE': '#39B54A',
  'WET': '#00AEEF',
  'UNKNOWN': '#888888',
};

// Get tyre color
export function getTyreColor(compound: string): string {
  return tyreColors[compound.toUpperCase()] || tyreColors['UNKNOWN'];
}

// Format lap time from seconds to mm:ss.xxx
export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '--:--.---';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

// Format time delta
export function formatDelta(delta: number): string {
  if (delta === 0) return '±0.000';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}`;
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// Get season years for selector (FastF1 data - 2018+)
export function getAvailableSeasons(): number[] {
  const currentYear = new Date().getFullYear();
  const seasons = [];
  for (let year = currentYear; year >= 2018; year--) {
    seasons.push(year);
  }
  return seasons;
}

// Get historical seasons for Jolpica API (1950+)
export function getHistoricalSeasons(): number[] {
  const currentYear = new Date().getFullYear();
  const seasons = [];
  for (let year = currentYear; year >= 1950; year--) {
    seasons.push(year);
  }
  return seasons;
}

// Session type display names
export const sessionTypeNames: Record<string, string> = {
  'FP1': 'Free Practice 1',
  'FP2': 'Free Practice 2',
  'FP3': 'Free Practice 3',
  'Q': 'Qualifying',
  'S': 'Sprint',
  'R': 'Race',
};

// Plotly dark theme layout
export const plotlyDarkLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(30,30,46,0.8)',
  font: {
    family: 'Titillium Web, sans-serif',
    color: '#F5F5F5',
  },
  xaxis: {
    gridcolor: 'rgba(56,56,63,0.5)',
    zerolinecolor: 'rgba(56,56,63,0.5)',
  },
  yaxis: {
    gridcolor: 'rgba(56,56,63,0.5)',
    zerolinecolor: 'rgba(56,56,63,0.5)',
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#F5F5F5' },
  },
  margin: { t: 40, r: 20, b: 50, l: 60 },
};

// Plotly chart config
export const plotlyConfig: Partial<Plotly.Config> = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'] as Plotly.ModeBarDefaultButtons[],
  responsive: true,
};
