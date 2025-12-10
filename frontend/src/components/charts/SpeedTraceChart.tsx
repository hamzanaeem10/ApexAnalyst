import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { SpeedTraceResponse } from '../../services/api';

interface SpeedTraceChartProps {
  data: SpeedTraceResponse;
}

export default function SpeedTraceChart({ data }: SpeedTraceChartProps) {
  const traces: Data[] = useMemo(() => {
    return data.speed_traces.map(trace => ({
      x: trace.trace.map(t => t.distance),
      y: trace.trace.map(t => t.speed),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `${trace.driver} ${trace.lap_time ? `(${trace.lap_time.toFixed(3)}s)` : ''}`,
      line: { color: trace.color, width: 2 },
      hovertemplate: `<b>${trace.driver}</b><br>Distance: %{x:.0f}m<br>Speed: %{y:.0f} km/h<extra></extra>`,
    }));
  }, [data]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: 'Speed Trace Comparison', font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Distance (m)', font: { size: 14 } },
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Speed (km/h)', font: { size: 14 } },
    },
    height: 450,
    legend: {
      orientation: 'h' as const,
      y: -0.15,
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
      
      {/* Driver summary */}
      <div className="mt-4 flex flex-wrap gap-3">
        {data.speed_traces.map(trace => (
          <div 
            key={trace.driver}
            className="bg-dark-800 px-3 py-2 rounded-lg flex items-center gap-2"
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: trace.color }}
            />
            <span className="font-medium">{trace.driver}</span>
            {trace.lap_time && (
              <span className="text-sm text-gray-400 font-mono">
                {trace.lap_time.toFixed(3)}s
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
