import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { plotlyDarkLayout, plotlyConfig } from '../../utils/helpers';
import type { SectorConsistencyResponse } from '../../services/api';

interface SectorConsistencyChartProps {
  data: SectorConsistencyResponse;
  sector?: 1 | 2 | 3;
}

export default function SectorConsistencyChart({ data, sector = 1 }: SectorConsistencyChartProps) {
  const traces: Data[] = useMemo(() => {
    const sectorKey = `sector_${sector}` as const;
    
    // Filter drivers that have data for this sector
    const driversWithData = data.drivers.filter(d => d.sectors[sectorKey]);
    
    // Sort by median time
    driversWithData.sort((a, b) => 
      (a.sectors[sectorKey]?.median || 0) - (b.sectors[sectorKey]?.median || 0)
    );
    
    return [{
      type: 'box' as const,
      x: driversWithData.map(d => d.driver),
      q1: driversWithData.map(d => d.sectors[sectorKey]?.q1 || 0),
      median: driversWithData.map(d => d.sectors[sectorKey]?.median || 0),
      q3: driversWithData.map(d => d.sectors[sectorKey]?.q3 || 0),
      lowerfence: driversWithData.map(d => d.sectors[sectorKey]?.min || 0),
      upperfence: driversWithData.map(d => d.sectors[sectorKey]?.max || 0),
      marker: {
        color: driversWithData.map(d => d.color),
      },
      line: {
        color: driversWithData.map(d => d.color),
      },
      fillcolor: 'rgba(59, 130, 246, 0.2)' as const,
      hoverinfo: 'all' as const,
      name: `Sector ${sector}`,
    }];
  }, [data, sector]);

  const layout = useMemo(() => ({
    ...plotlyDarkLayout,
    title: { text: `Sector ${sector} Time Consistency`, font: { color: '#F5F5F5', size: 18 } },
    xaxis: { 
      ...plotlyDarkLayout.xaxis, 
      title: { text: 'Driver', font: { size: 14 } },
    },
    yaxis: { 
      ...plotlyDarkLayout.yaxis, 
      title: { text: 'Sector Time (s)', font: { size: 14 } },
    },
    height: 400,
    showlegend: false,
  } as unknown as Partial<Layout>), [sector]);

  // Calculate consistency stats
  const consistencyStats = useMemo(() => {
    const sectorKey = `sector_${sector}` as const;
    return data.drivers
      .filter(d => d.sectors[sectorKey])
      .map(d => ({
        driver: d.driver,
        color: d.color,
        std: d.sectors[sectorKey]?.std || 0,
        range: (d.sectors[sectorKey]?.max || 0) - (d.sectors[sectorKey]?.min || 0),
        median: d.sectors[sectorKey]?.median || 0,
      }))
      .sort((a, b) => a.std - b.std); // Most consistent first
  }, [data, sector]);

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout}
        config={plotlyConfig as object}
        className="w-full"
      />
      
      {/* Consistency ranking */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Consistency Ranking (Lower σ = More Consistent)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {consistencyStats.slice(0, 10).map((driver, idx) => (
            <div 
              key={driver.driver}
              className={`p-2 rounded-lg text-sm ${idx === 0 ? 'bg-green-900/30 border border-green-500/30' : 'bg-dark-800'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-green-500 text-black' : 'bg-dark-700'
                }`}>
                  {idx + 1}
                </span>
                <span className="font-medium" style={{ color: driver.color }}>{driver.driver}</span>
              </div>
              <div className="text-xs text-gray-400">
                <p>σ: <span className="font-mono">{(driver.std * 1000).toFixed(0)}ms</span></p>
                <p>Range: <span className="font-mono">{(driver.range * 1000).toFixed(0)}ms</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
