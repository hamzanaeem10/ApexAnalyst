import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';
import type { DeltaTPoint } from '../../types';

interface DeltaTChartProps {
  data: DeltaTPoint[];
  driver1: { id: string; name: string; color: string };
  driver2: { id: string; name: string; color: string };
  height?: number;
}

/**
 * Delta-T Chart - Cumulative Time Loss visualization
 * Shows where time is gained or lost between two drivers along the track distance
 */
export default function DeltaTChart({ 
  data, 
  driver1, 
  driver2,
  height = 300
}: DeltaTChartProps) {
  
  const traces = useMemo<Data[]>(() => {
    if (!data || data.length === 0) return [];

    // Split data into gain/loss regions for fill coloring
    const distances = data.map(p => p.distance);
    const deltas = data.map(p => p.delta);
    
    // Find crossover points for better visualization
    const gainRegions: { x: number[]; y: number[] } = { x: [], y: [] };
    const lossRegions: { x: number[]; y: number[] } = { x: [], y: [] };
    
    data.forEach((point) => {
      if (point.delta >= 0) {
        gainRegions.x.push(point.distance);
        gainRegions.y.push(point.delta);
      }
      if (point.delta <= 0) {
        lossRegions.x.push(point.distance);
        lossRegions.y.push(point.delta);
      }
    });

    return [
      // Zero line (reference)
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Reference',
        x: [distances[0], distances[distances.length - 1]],
        y: [0, 0],
        line: { color: '#666', width: 1, dash: 'dash' },
        showlegend: false,
        hoverinfo: 'skip' as const,
      },
      // Main delta line
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Time Delta',
        x: distances,
        y: deltas,
        line: { color: '#FFFFFF', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(255, 255, 255, 0.1)',
        hovertemplate: `Distance: %{x:.0f}m<br>` +
          `Delta: %{y:.3f}s<br>` +
          `<extra></extra>`,
      },
      // Positive region overlay (Driver 1 faster - red)
      {
        type: 'scatter' as const,
        mode: 'none' as const,
        name: `${driver1.id} faster`,
        x: distances,
        y: deltas.map(d => d > 0 ? d : 0),
        fill: 'tozeroy',
        fillcolor: `${driver1.color}40`,
        showlegend: true,
        hoverinfo: 'skip' as const,
      },
      // Negative region overlay (Driver 2 faster - green)
      {
        type: 'scatter' as const,
        mode: 'none' as const,
        name: `${driver2.id} faster`,
        x: distances,
        y: deltas.map(d => d < 0 ? d : 0),
        fill: 'tozeroy',
        fillcolor: `${driver2.color}40`,
        showlegend: true,
        hoverinfo: 'skip' as const,
      },
    ];
  }, [data, driver1, driver2]);

  const layout = useMemo<Partial<Layout>>(() => {
    const maxDelta = data.length ? Math.max(...data.map(p => Math.abs(p.delta))) : 1;
    const yRange = Math.ceil(maxDelta * 1.2 * 10) / 10; // Round up with 20% margin

    return {
      title: {
        text: `Delta-T: ${driver1.id} vs ${driver2.id}`,
        font: { color: '#FFFFFF', size: 14 },
      },
      paper_bgcolor: '#1a1a2e',
      plot_bgcolor: '#1a1a2e',
      font: { color: '#FFFFFF', size: 11 },
      xaxis: {
        title: { text: 'Distance (m)', font: { color: '#FFFFFF' } },
        gridcolor: '#333',
        zeroline: false,
      },
      yaxis: {
        title: { text: 'Cumulative Time Δ (s)', font: { color: '#FFFFFF' } },
        gridcolor: '#333',
        zeroline: true,
        zerolinecolor: '#666',
        zerolinewidth: 1,
        range: [-yRange, yRange],
        tickformat: '.2f',
      },
      legend: {
        orientation: 'h' as const,
        y: -0.2,
        x: 0.5,
        xanchor: 'center' as const,
        font: { size: 10 },
      },
      margin: { t: 40, r: 20, b: 60, l: 50 },
      hovermode: 'x' as const,
      // Annotations for interpretation
      annotations: data.length ? [
        {
          x: 0.02,
          y: 0.98,
          xref: 'paper',
          yref: 'paper',
          text: `↑ ${driver1.id} gaining`,
          showarrow: false,
          font: { color: driver1.color, size: 10 },
          xanchor: 'left' as const,
        },
        {
          x: 0.02,
          y: 0.02,
          xref: 'paper',
          yref: 'paper',
          text: `↓ ${driver2.id} gaining`,
          showarrow: false,
          font: { color: driver2.color, size: 10 },
          xanchor: 'left' as const,
        },
      ] : [],
    };
  }, [data, driver1, driver2]);

  const config: Partial<Config> = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  if (!data || data.length === 0) {
    return (
      <div className="apex-card p-4 text-center text-gray-400">
        <p>No Delta-T data available</p>
      </div>
    );
  }

  // Calculate summary stats
  const finalDelta = data[data.length - 1]?.delta || 0;
  const maxGain = Math.min(...data.map(p => p.delta));
  const maxLoss = Math.max(...data.map(p => p.delta));

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: `${height}px` }}
        useResizeHandler
      />
      
      {/* Summary stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-f1-gray/20 rounded p-2 text-center">
          <p className="text-gray-400">Final Delta</p>
          <p className={`font-mono font-bold ${finalDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {finalDelta > 0 ? '+' : ''}{finalDelta.toFixed(3)}s
          </p>
        </div>
        <div className="bg-f1-gray/20 rounded p-2 text-center">
          <p className="text-gray-400">Max {driver1.id} Gain</p>
          <p className="font-mono font-bold" style={{ color: driver1.color }}>
            {maxLoss > 0 ? `+${maxLoss.toFixed(3)}s` : '-'}
          </p>
        </div>
        <div className="bg-f1-gray/20 rounded p-2 text-center">
          <p className="text-gray-400">Max {driver2.id} Gain</p>
          <p className="font-mono font-bold" style={{ color: driver2.color }}>
            {maxGain < 0 ? `${maxGain.toFixed(3)}s` : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
