import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { PositionChangesResponse } from '../../services/api';

interface PositionChartProps {
  data: PositionChangesResponse;
}

export default function PositionChart({ data }: PositionChartProps) {
  const traces: Data[] = useMemo(() => {
    return data.drivers.map(driver => ({
      x: driver.positions.map(p => p.lap),
      y: driver.positions.map(p => p.position),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: driver.driver,
      line: { color: driver.color, width: 2 },
      hovertemplate: `<b>${driver.driver}</b><br>Lap: %{x}<br>Position: P%{y}<extra></extra>`,
    }));
  }, [data]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: 'Position Changes Throughout Race', font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Lap', font: { size: 14 } },
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Position', font: { size: 14 } },
      autorange: 'reversed' as const, // P1 at top
      dtick: 1,
    },
    height: 500,
    legend: {
      orientation: 'v' as const,
      y: 0.5,
      x: 1.02,
      font: { color: '#F5F5F5', size: 10 },
    },
  } as unknown as Partial<Layout>), []);

  // Top movers
  const topMovers = useMemo(() => {
    return [...data.drivers]
      .sort((a, b) => b.positions_gained - a.positions_gained)
      .slice(0, 5);
  }, [data.drivers]);

  // Biggest losers
  const biggestLosers = useMemo(() => {
    return [...data.drivers]
      .filter(d => d.positions_gained < 0)
      .sort((a, b) => a.positions_gained - b.positions_gained)
      .slice(0, 5);
  }, [data.drivers]);

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={plotlyConfig as object}
        className="w-full"
      />
      
      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top movers */}
        <div className="bg-dark-800 p-4 rounded-lg">
          <h4 className="text-green-400 font-medium mb-3">📈 Top Position Gainers</h4>
          <div className="space-y-2">
            {topMovers.map((driver, idx) => (
              <div key={driver.driver} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-gray-400">{idx + 1}.</span>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: driver.color }}
                  />
                  <span>{driver.driver}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">
                    P{driver.start_position} → P{driver.end_position}
                  </span>
                  <span className="text-green-400 font-mono">
                    +{driver.positions_gained}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Biggest losers */}
        <div className="bg-dark-800 p-4 rounded-lg">
          <h4 className="text-red-400 font-medium mb-3">📉 Position Losers</h4>
          <div className="space-y-2">
            {biggestLosers.map((driver, idx) => (
              <div key={driver.driver} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-gray-400">{idx + 1}.</span>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: driver.color }}
                  />
                  <span>{driver.driver}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">
                    P{driver.start_position} → P{driver.end_position}
                  </span>
                  <span className="text-red-400 font-mono">
                    {driver.positions_gained}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
