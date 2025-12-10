import Plot from 'react-plotly.js';
import { plotlyDarkLayout, plotlyConfig, getTyreColor } from '../../utils/helpers';
import type { Data, Layout } from 'plotly.js';
import type { DriverLapData } from '../../types';

interface LapTimeChartProps {
  driversData: DriverLapData[];
  height?: number;
  showStints?: boolean;
}

export default function LapTimeChart({
  driversData,
  height = 450,
  showStints = true,
}: LapTimeChartProps) {
  // Create traces for each driver
  const traces: Data[] = driversData.flatMap((driver) => {
    if (showStints) {
      // Group laps by stint for tyre compound coloring
      return driver.stints.map((stint, idx) => {
        const stintLaps = driver.laps.filter(
          (lap) => lap.lap_number >= stint.start_lap && lap.lap_number <= stint.end_lap
        );
        
        return {
          x: stintLaps.map((lap) => lap.lap_number),
          y: stintLaps.map((lap) => lap.lap_time),
          type: 'scatter' as const,
          mode: 'lines+markers' as const,
          name: `${driver.driver} - ${stint.compound}`,
          line: {
            color: getTyreColor(stint.compound),
            width: 2,
          },
          marker: {
            color: getTyreColor(stint.compound),
            size: 6,
          },
          legendgroup: driver.driver,
          showlegend: idx === 0,
        };
      });
    } else {
      return [{
        x: driver.laps.map((lap) => lap.lap_number),
        y: driver.laps.map((lap) => lap.lap_time),
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        name: driver.driver,
        line: { width: 2 },
        marker: { size: 5 },
      }];
    }
  });

  const layout: Partial<Layout> = {
    ...plotlyDarkLayout,
    title: {
      text: 'Lap Times Evolution',
      font: { size: 16, color: '#F5F5F5' },
    },
    xaxis: {
      ...plotlyDarkLayout.xaxis,
      title: { text: 'Lap Number', font: { size: 12 } },
    },
    yaxis: {
      ...plotlyDarkLayout.yaxis,
      title: { text: 'Lap Time (s)', font: { size: 12 } },
      autorange: 'reversed' as const, // Faster times at top
    },
    height,
    autosize: true,
    hovermode: 'closest',
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
