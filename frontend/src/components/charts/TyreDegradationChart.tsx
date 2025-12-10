import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { TyreDegradationResponse } from '../../services/api';

interface TyreDegradationChartProps {
  data: TyreDegradationResponse;
}

export default function TyreDegradationChart({ data }: TyreDegradationChartProps) {
  const traces: Data[] = useMemo(() => {
    const plotTraces: Data[] = [];
    
    Object.entries(data.degradation_curves).forEach(([compound, curveData]) => {
      // Median points with error bars
      plotTraces.push({
        x: curveData.data_points.map(p => p.tyre_age),
        y: curveData.data_points.map(p => p.median_time),
        error_y: {
          type: 'data' as const,
          array: curveData.data_points.map(p => p.std_dev),
          visible: true,
          color: curveData.color,
        },
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        name: `${compound} (${curveData.degradation_rate > 0 ? '+' : ''}${(curveData.degradation_rate * 1000).toFixed(1)}ms/lap)`,
        line: { color: curveData.color, width: 3 },
        marker: { color: curveData.color, size: 8 },
        hovertemplate: `<b>${compound}</b><br>Tyre Age: %{x} laps<br>Lap Time: %{y:.3f}s<extra></extra>`,
      });
      
      // Trend line
      const maxAge = Math.max(...curveData.data_points.map(p => p.tyre_age));
      const trendX = Array.from({ length: maxAge }, (_, i) => i + 1);
      const trendY = trendX.map(x => curveData.base_pace + curveData.degradation_rate * x);
      
      plotTraces.push({
        x: trendX,
        y: trendY,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `${compound} Trend`,
        line: { color: curveData.color, width: 1, dash: 'dash' },
        showlegend: false,
        hoverinfo: 'skip' as const,
      });
    });
    
    return plotTraces;
  }, [data]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: 'Tyre Degradation Curves', font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Tyre Age (Laps)', font: { size: 14 } },
      dtick: 5,
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Lap Time (s)', font: { size: 14 } },
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
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {Object.entries(data.degradation_curves).map(([compound, curveData]) => (
          <div key={compound} className="bg-dark-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: curveData.color }}
              />
              <span className="font-medium">{compound}</span>
            </div>
            <div className="text-gray-400">
              <p>Deg: {curveData.degradation_rate > 0 ? '+' : ''}{(curveData.degradation_rate * 1000).toFixed(1)} ms/lap</p>
              <p>R²: {(curveData.r_squared * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
