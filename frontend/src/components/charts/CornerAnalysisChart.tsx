import Plot from 'react-plotly.js';
import type { CornerAnalysisResponse } from '../../services/api';
import { plotlyDarkLayout } from '../../utils/helpers';

interface CornerAnalysisChartProps {
  data: CornerAnalysisResponse;
}

export default function CornerAnalysisChart({ data }: CornerAnalysisChartProps) {
  // Speed comparison bar chart
  const speedTrace: Plotly.Data = {
    type: 'bar',
    x: data.analysis.map(d => d.driver),
    y: data.analysis.map(d => d.min_speed),
    name: 'Min Speed',
    marker: { 
      color: data.analysis.map(d => d.color),
    },
    hovertemplate: '%{x}<br>Min Speed: %{y:.1f} km/h<extra></extra>',
  };

  const entrySpeedTrace: Plotly.Data = {
    type: 'scatter',
    mode: 'markers',
    x: data.analysis.map(d => d.driver),
    y: data.analysis.map(d => d.entry_speed),
    name: 'Entry Speed',
    marker: { size: 12, symbol: 'triangle-down', color: '#3B82F6' },
    hovertemplate: '%{x}<br>Entry: %{y:.1f} km/h<extra></extra>',
  };

  const exitSpeedTrace: Plotly.Data = {
    type: 'scatter',
    mode: 'markers',
    x: data.analysis.map(d => d.driver),
    y: data.analysis.map(d => d.exit_speed),
    name: 'Exit Speed',
    marker: { size: 12, symbol: 'triangle-up', color: '#22C55E' },
    hovertemplate: '%{x}<br>Exit: %{y:.1f} km/h<extra></extra>',
  };

  const speedLayout = {
    ...plotlyDarkLayout,
    title: `Corner Analysis @ ${data.corner_distance}m`,
    xaxis: {
      ...plotlyDarkLayout.xaxis,
      title: 'Driver',
    },
    yaxis: {
      ...plotlyDarkLayout.yaxis,
      title: 'Speed (km/h)',
    },
    barmode: 'overlay' as const,
    showlegend: true,
    legend: {
      ...plotlyDarkLayout.legend,
      orientation: 'h' as const,
      y: -0.15,
    },
  };

  // Delta to best chart
  const deltaTrace: Plotly.Data = {
    type: 'bar',
    x: data.analysis.map(d => d.driver),
    y: data.analysis.map(d => d.delta_to_best),
    marker: {
      color: data.analysis.map(d => d.delta_to_best === 0 ? '#22C55E' : '#EF4444'),
    },
    hovertemplate: '%{x}<br>Delta: +%{y:.3f}s<extra></extra>',
  };

  const deltaLayout = {
    ...plotlyDarkLayout,
    title: { text: 'Time Delta to Best Driver', font: { color: '#F5F5F5', size: 18 } },
    xaxis: {
      ...plotlyDarkLayout.xaxis,
      title: 'Driver',
    },
    yaxis: {
      ...plotlyDarkLayout.yaxis,
      title: 'Delta (s)',
    },
    showlegend: false,
  };

  // Sort by rank for the table
  const sortedAnalysis = [...data.analysis].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-4">
      <div className="apex-card p-4">
        <Plot
          data={[speedTrace, entrySpeedTrace, exitSpeedTrace]}
          layout={speedLayout as any}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '350px' }}
        />
      </div>

      <div className="apex-card p-4">
        <Plot
          data={[deltaTrace]}
          layout={deltaLayout as any}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '250px' }}
        />
      </div>

      {/* Detailed table */}
      <div className="apex-card p-4">
        <h4 className="text-lg font-semibold mb-3">📊 Corner Performance Ranking</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-2 px-3">Rank</th>
                <th className="text-left py-2 px-3">Driver</th>
                <th className="text-right py-2 px-3">Entry</th>
                <th className="text-right py-2 px-3">Min</th>
                <th className="text-right py-2 px-3">Exit</th>
                <th className="text-right py-2 px-3">Speed Loss</th>
                <th className="text-right py-2 px-3">Speed Gain</th>
                <th className="text-right py-2 px-3">Delta</th>
              </tr>
            </thead>
            <tbody>
              {sortedAnalysis.map((d) => (
                <tr key={d.driver} className="border-b border-dark-800 hover:bg-dark-800">
                  <td className="py-2 px-3">
                    <span className={`font-bold ${
                      d.rank === 1 ? 'text-amber-400' :
                      d.rank === 2 ? 'text-gray-300' :
                      d.rank === 3 ? 'text-amber-700' : 'text-gray-400'
                    }`}>
                      P{d.rank}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="font-medium">{d.driver}</span>
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 font-mono">{d.entry_speed.toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-mono">{d.min_speed.toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-mono">{d.exit_speed.toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-mono text-red-400">-{d.speed_loss.toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-mono text-green-400">+{d.speed_gain.toFixed(0)}</td>
                  <td className="text-right py-2 px-3 font-mono">
                    {d.delta_to_best === 0 ? (
                      <span className="text-green-400">Best</span>
                    ) : (
                      <span className="text-red-400">+{d.delta_to_best.toFixed(3)}s</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
