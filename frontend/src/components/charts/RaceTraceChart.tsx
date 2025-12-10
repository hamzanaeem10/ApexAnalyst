import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';
import type { RaceGapsResponse } from '../../types';

interface RaceTraceChartProps {
  data: RaceGapsResponse;
  height?: number;
  selectedDrivers?: string[];
}

/**
 * Race Trace Chart - Gap to Rival visualization
 * Shows cumulative time delta relative to a benchmark driver lap by lap
 */
export default function RaceTraceChart({ 
  data, 
  height = 450,
  selectedDrivers 
}: RaceTraceChartProps) {
  
  const traces = useMemo<Data[]>(() => {
    const filteredDrivers = selectedDrivers?.length 
      ? data.driver_gaps.filter(d => selectedDrivers.includes(d.driver))
      : data.driver_gaps;

    return filteredDrivers.map((driverData) => ({
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: driverData.driver,
      x: driverData.gaps.map(g => g.lap),
      y: driverData.gaps.map(g => g.gap),
      line: {
        color: driverData.color,
        width: driverData.is_benchmark ? 3 : 2,
      },
      fill: driverData.is_benchmark ? undefined : 'tonexty',
      fillcolor: driverData.is_benchmark ? undefined : `${driverData.color}20`,
      hovertemplate: `<b>${driverData.driver}</b><br>` +
        `Lap %{x}<br>` +
        `Gap: %{y:.3f}s<br>` +
        `<extra></extra>`,
    }));
  }, [data, selectedDrivers]);

  const layout = useMemo<Partial<Layout>>(() => ({
    title: {
      text: `${data.year} ${data.event_name} - Race Trace (Gap to ${data.benchmark_driver})`,
      font: { color: '#FFFFFF', size: 16 },
    },
    paper_bgcolor: '#1a1a2e',
    plot_bgcolor: '#1a1a2e',
    font: { color: '#FFFFFF' },
    xaxis: {
      title: { text: 'Lap Number', font: { color: '#FFFFFF' } },
      gridcolor: '#333',
      zeroline: false,
      range: [0, data.total_laps + 1],
    },
    yaxis: {
      title: { text: 'Gap to Reference (seconds)', font: { color: '#FFFFFF' } },
      gridcolor: '#333',
      zeroline: true,
      zerolinecolor: '#E10600',
      zerolinewidth: 2,
      hoverformat: '.3f',
    },
    legend: {
      orientation: 'v' as const,
      x: 1.02,
      y: 1,
      font: { size: 10 },
      bgcolor: 'rgba(26, 26, 46, 0.8)',
    },
    hovermode: 'x unified' as const,
    margin: { t: 50, r: 150, b: 50, l: 60 },
    // Add annotations for key events
    annotations: [{
      x: 0.5,
      y: 0,
      xref: 'paper',
      yref: 'y',
      text: `← ${data.benchmark_driver} Pace`,
      showarrow: false,
      font: { color: '#E10600', size: 10 },
    }],
  }), [data]);

  const config: Partial<Config> = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: `${height}px` }}
        useResizeHandler
      />
      <div className="mt-2 text-xs text-gray-400 text-center">
        Positive values = behind {data.benchmark_driver} | Negative values = ahead of {data.benchmark_driver}
      </div>
    </div>
  );
}
