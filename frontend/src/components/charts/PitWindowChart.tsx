import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { PitWindowResponse } from '../../services/api';

interface PitWindowChartProps {
  data: PitWindowResponse;
}

export default function PitWindowChart({ data }: PitWindowChartProps) {
  const traces: Data[] = useMemo(() => {
    const plotTraces: Data[] = [];
    
    // Cumulative degradation loss
    plotTraces.push({
      x: data.lap_analysis.map(l => l.lap),
      y: data.lap_analysis.map(l => l.cumulative_deg_loss),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Cumulative Deg Loss',
      line: { color: '#EF4444', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(239, 68, 68, 0.1)',
    });
    
    // Pit time loss line
    plotTraces.push({
      x: [data.lap_analysis[0]?.lap || 1, data.lap_analysis[data.lap_analysis.length - 1]?.lap || 50],
      y: [data.pit_time_loss, data.pit_time_loss],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Pit Loss (${data.pit_time_loss}s)`,
      line: { color: '#F59E0B', width: 2, dash: 'dash' },
    });
    
    // Undercut window
    if (data.undercut_window) {
      plotTraces.push({
        x: [data.undercut_window.start, data.undercut_window.start, data.undercut_window.end, data.undercut_window.end],
        y: [0, data.pit_time_loss * 2, data.pit_time_loss * 2, 0],
        fill: 'toself',
        fillcolor: 'rgba(34, 197, 94, 0.2)',
        line: { width: 0 },
        type: 'scatter' as const,
        mode: 'none' as const,
        name: 'Undercut Window',
      });
    }
    
    // Overcut window
    if (data.overcut_window) {
      plotTraces.push({
        x: [data.overcut_window.start, data.overcut_window.start, data.overcut_window.end, data.overcut_window.end],
        y: [0, data.pit_time_loss * 2, data.pit_time_loss * 2, 0],
        fill: 'toself',
        fillcolor: 'rgba(59, 130, 246, 0.2)',
        line: { width: 0 },
        type: 'scatter' as const,
        mode: 'none' as const,
        name: 'Overcut Window',
      });
    }
    
    // Optimal pit lap marker
    if (data.optimal_pit_lap) {
      plotTraces.push({
        x: [data.optimal_pit_lap],
        y: [data.pit_time_loss],
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: 'Optimal Pit',
        marker: { 
          color: '#22C55E', 
          size: 15, 
          symbol: 'diamond',
          line: { color: '#FFFFFF', width: 2 }
        },
      });
    }
    
    return plotTraces;
  }, [data]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: `Pit Window Analysis - ${data.driver}`, font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Lap', font: { size: 14 } },
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Time Loss (s)', font: { size: 14 } },
    },
    height: 400,
    legend: {
      orientation: 'h' as const,
      y: -0.15,
      x: 0.5,
      xanchor: 'center' as const,
      font: { color: '#F5F5F5' },
    },
  } as unknown as Partial<Layout>), [data.driver]);

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={plotlyConfig as object}
        className="w-full"
      />
      
      {/* Strategy recommendations */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Optimal Pit Lap</p>
          <p className="text-2xl font-mono font-bold text-green-400">
            {data.optimal_pit_lap || 'N/A'}
          </p>
        </div>
        
        {data.undercut_window && (
          <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
            <p className="text-green-400 text-sm font-medium">🏎️ Undercut Window</p>
            <p className="font-mono">Laps {data.undercut_window.start} - {data.undercut_window.end}</p>
            <p className="text-xs text-gray-400 mt-1">{data.undercut_window.recommendation}</p>
          </div>
        )}
        
        {data.overcut_window && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
            <p className="text-blue-400 text-sm font-medium">🛣️ Overcut Window</p>
            <p className="font-mono">Laps {data.overcut_window.start} - {data.overcut_window.end}</p>
            <p className="text-xs text-gray-400 mt-1">{data.overcut_window.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
