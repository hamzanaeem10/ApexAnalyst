import Plot from 'react-plotly.js';
import { plotlyDarkLayout, plotlyConfig, getTyreColor } from '../../utils/helpers';
import type { Layout } from 'plotly.js';
import type { DriverStrategy } from '../../types';

interface StrategyTimelineProps {
  driversStrategy: DriverStrategy[];
  totalLaps: number;
  height?: number;
}

export default function StrategyTimeline({
  driversStrategy,
  totalLaps,
  height = 500,
}: StrategyTimelineProps) {
  // Create horizontal bar traces for each stint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traces: any[] = [];
  let hasPitStopLegend = false;
  
  driversStrategy.forEach((driver) => {
    let currentLap = 1;
    
    driver.stint_lengths.forEach((stintLength, stintIdx) => {
      const compound = driver.compounds_used[stintIdx] || 'UNKNOWN';
      
      traces.push({
        type: 'bar' as const,
        orientation: 'h' as const,
        y: [driver.driver],
        x: [stintLength],
        base: [currentLap - 1],
        name: compound,
        marker: {
          color: getTyreColor(compound),
          line: { color: '#1E1E2E', width: 1 },
        },
        legendgroup: compound,
        showlegend: traces.findIndex(t => t.name === compound) === -1,
        hovertemplate: `${driver.driver}<br>Stint ${stintIdx + 1}: ${compound}<br>Laps: ${currentLap} - ${currentLap + stintLength - 1}<extra></extra>`,
      });
      
      currentLap += stintLength;
    });
    
    // Add pit stop markers
    driver.pit_stops.forEach((pit) => {
      traces.push({
        type: 'scatter' as const,
        mode: 'markers' as const,
        y: [driver.driver],
        x: [pit.lap],
        marker: {
          symbol: 'diamond',
          size: 12,
          color: '#FFC300',
          line: { color: '#000', width: 1 },
        },
        name: 'Pit Stop',
        legendgroup: 'pitstop',
        showlegend: !hasPitStopLegend,
        hovertemplate: `${driver.driver}<br>Pit Stop: Lap ${pit.lap}<br>Duration: ${pit.duration.toFixed(1)}s<extra></extra>`,
      });
      hasPitStopLegend = true;
    });
  });

  const layout: Partial<Layout> = {
    ...plotlyDarkLayout,
    title: {
      text: 'Race Strategy Timeline',
      font: { size: 16, color: '#F5F5F5' },
    },
    xaxis: {
      ...plotlyDarkLayout.xaxis,
      title: { text: 'Lap Number', font: { size: 12 } },
      range: [0, totalLaps + 2],
    },
    yaxis: {
      ...plotlyDarkLayout.yaxis,
      title: { text: '', font: { size: 12 } },
      categoryorder: 'total ascending' as const,
    },
    barmode: 'stack' as const,
    height,
    autosize: true,
  };

  return (
    <div className="plotly-chart-container apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={plotlyConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
}
