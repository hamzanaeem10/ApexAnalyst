import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { FuelEffectResponse } from '../../services/api';

interface FuelEffectChartProps {
  data: FuelEffectResponse;
}

export default function FuelEffectChart({ data }: FuelEffectChartProps) {
  const traces: Data[] = useMemo(() => {
    return [
      // Fuel remaining
      {
        x: data.fuel_effect.map(f => f.lap),
        y: data.fuel_effect.map(f => f.fuel_remaining),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Fuel Remaining (kg)',
        line: { color: '#F59E0B', width: 2 },
        yaxis: 'y',
        fill: 'tozeroy',
        fillcolor: 'rgba(245, 158, 11, 0.1)',
      },
      // Cumulative time gained
      {
        x: data.fuel_effect.map(f => f.lap),
        y: data.fuel_effect.map(f => f.cumulative_time_gained),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Time Gained (s)',
        line: { color: '#22C55E', width: 2 },
        yaxis: 'y2',
      },
    ];
  }, [data]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: 'Fuel Load Effect on Lap Time', font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Lap', font: { size: 14 } },
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Fuel (kg)', font: { size: 14, color: '#F59E0B' } },
      side: 'left' as const,
    },
    yaxis2: {
      ...plotlyDarkLayout.yaxis,
      title: { text: 'Time Gained (s)', font: { size: 14, color: '#22C55E' } },
      side: 'right' as const,
      overlaying: 'y' as const,
    },
    height: 350,
    legend: {
      orientation: 'h' as const,
      y: -0.2,
      x: 0.5,
      xanchor: 'center' as const,
      font: { color: '#F5F5F5' },
    },
  } as unknown as Partial<Layout>), []);

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={plotlyConfig as object}
        className="w-full"
      />
      
      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Start Fuel</p>
          <p className="font-mono text-amber-400">{data.estimated_start_fuel_kg} kg</p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Burn Rate</p>
          <p className="font-mono">{data.fuel_consumption_per_lap_kg} kg/lap</p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Gain per kg</p>
          <p className="font-mono text-green-400">{(data.time_improvement_per_kg * 1000).toFixed(0)} ms</p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Total Effect</p>
          <p className="font-mono text-green-400">-{data.total_fuel_effect_seconds.toFixed(2)}s</p>
        </div>
      </div>
    </div>
  );
}
