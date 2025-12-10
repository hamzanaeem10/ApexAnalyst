import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { WeatherTimelineResponse } from '../../services/api';

interface WeatherTimelineChartProps {
  data: WeatherTimelineResponse;
}

export default function WeatherTimelineChart({ data }: WeatherTimelineChartProps) {
  const traces: Data[] = useMemo(() => {
    const plotTraces: Data[] = [];
    
    const times = data.timeline.map(t => t.time_minutes);
    
    // Track temperature
    plotTraces.push({
      x: times,
      y: data.timeline.map(t => t.track_temp),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Track Temp (°C)',
      line: { color: '#FF8700', width: 2 },
      yaxis: 'y',
    });
    
    // Air temperature
    plotTraces.push({
      x: times,
      y: data.timeline.map(t => t.air_temp),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Air Temp (°C)',
      line: { color: '#00D2BE', width: 2 },
      yaxis: 'y',
    });
    
    // Humidity on secondary axis
    if (data.timeline.some(t => t.humidity !== null)) {
      plotTraces.push({
        x: times,
        y: data.timeline.map(t => t.humidity),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Humidity (%)',
        line: { color: '#3B82F6', width: 2, dash: 'dot' },
        yaxis: 'y2',
      });
    }
    
    // Rain periods as shaded regions
    data.rain_periods.forEach((period, idx) => {
      plotTraces.push({
        x: [period.start, period.start, period.end, period.end],
        y: [0, 100, 100, 0],
        fill: 'toself',
        fillcolor: 'rgba(59, 130, 246, 0.2)',
        line: { width: 0 },
        type: 'scatter' as const,
        mode: 'none' as const,
        name: idx === 0 ? 'Rain Period' : undefined,
        showlegend: idx === 0,
        hoverinfo: 'skip' as const,
      });
    });
    
    return plotTraces;
  }, [data]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: 'Weather Timeline', font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Session Time (minutes)', font: { size: 14 } },
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Temperature (°C)', font: { size: 14 } },
      side: 'left' as const,
    },
    yaxis2: {
      ...plotlyDarkLayout.yaxis,
      title: { text: 'Humidity (%)', font: { size: 14 } },
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

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={plotlyConfig as object}
        className="w-full"
      />
      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Track Temp</p>
          <p className="text-orange-400 font-mono">
            {data.summary.track_temp.min}° - {data.summary.track_temp.max}°C
          </p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Air Temp</p>
          <p className="text-teal-400 font-mono">
            {data.summary.air_temp.min}° - {data.summary.air_temp.max}°C
          </p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Humidity</p>
          <p className="text-blue-400 font-mono">
            {data.summary.humidity.min}% - {data.summary.humidity.max}%
          </p>
        </div>
        <div className="bg-dark-800 p-3 rounded-lg">
          <p className="text-gray-400">Rainfall</p>
          <p className={data.summary.rainfall_detected ? 'text-blue-400' : 'text-green-400'}>
            {data.summary.rainfall_detected ? `Yes (${data.rain_periods.length} periods)` : 'No'}
          </p>
        </div>
      </div>
    </div>
  );
}
