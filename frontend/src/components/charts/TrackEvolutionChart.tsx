import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { TrackEvolutionResponse } from '../../services/api';

interface TrackEvolutionChartProps {
  data: TrackEvolutionResponse;
}

export default function TrackEvolutionChart({ data }: TrackEvolutionChartProps) {
  const traces: Data[] = useMemo(() => {
    const laps = data.evolution.map(e => e.lap);
    
    return [
      // Actual median lap times
      {
        x: laps,
        y: data.evolution.map(e => e.median_lap_time),
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        name: 'Median Lap Time',
        line: { color: '#3B82F6', width: 2 },
        marker: { color: '#3B82F6', size: 6 },
      },
      // Trend line
      {
        x: laps,
        y: data.evolution.map(e => e.trend_time),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Trend Line',
        line: { color: '#F59E0B', width: 2, dash: 'dash' },
      },
      // Grip level on secondary axis
      {
        x: laps,
        y: data.evolution.map(e => e.grip_level),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Grip Level (%)',
        line: { color: '#22C55E', width: 2 },
        yaxis: 'y2',
        fill: 'tozeroy',
        fillcolor: 'rgba(34, 197, 94, 0.1)',
      },
    ];
  }, [data]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: 'Track Evolution & Grip Level', font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Lap Number', font: { size: 14 } },
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Lap Time (s)', font: { size: 14 } },
      side: 'left' as const,
    },
    yaxis2: {
      ...plotlyDarkLayout.yaxis,
      title: { text: 'Grip Level (%)', font: { size: 14 } },
      side: 'right' as const,
      overlaying: 'y' as const,
      range: [0, 100],
    },
    height: 400,
    legend: {
      orientation: 'h' as const,
      y: -0.15,
      x: 0.5,
      xanchor: 'center' as const,
      font: { color: '#F5F5F5' },
    },
  } as unknown as Partial<Layout>), []);

  const trendIcon = data.evolution_trend === 'improving' ? '📈' : 
                    data.evolution_trend === 'degrading' ? '📉' : '➡️';
  
  const trendColor = data.evolution_trend === 'improving' ? 'text-green-400' : 
                     data.evolution_trend === 'degrading' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={plotlyConfig as object}
        className="w-full"
      />
      
      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Track Trend</p>
          <p className={`font-medium ${trendColor}`}>
            {trendIcon} {data.evolution_trend.charAt(0).toUpperCase() + data.evolution_trend.slice(1)}
          </p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Evolution Rate</p>
          <p className="font-mono">
            {data.evolution_rate_per_lap > 0 ? '+' : ''}{(data.evolution_rate_per_lap * 1000).toFixed(1)} ms/lap
          </p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Total Improvement</p>
          <p className={`font-mono ${data.time_improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.time_improvement > 0 ? '-' : '+'}{Math.abs(data.time_improvement).toFixed(3)}s
          </p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Fastest at Lap</p>
          <p className="font-mono">{data.fastest_lap_number}</p>
        </div>
      </div>
    </div>
  );
}
