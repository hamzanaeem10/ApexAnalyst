import { useMemo } from 'react';
import type { MiniSectorResponse } from '../../services/api';

interface MiniSectorChartProps {
  data: MiniSectorResponse;
  selectedDriver?: string;
}

export default function MiniSectorChart({ data, selectedDriver: _selectedDriver }: MiniSectorChartProps) {
  // Create track visualization with colored sectors
  const trackSegments = useMemo(() => {
    return data.mini_sectors.map((sector) => {
      const width = (sector.end_distance - sector.start_distance) / data.track_length * 100;
      return {
        ...sector,
        width,
        left: sector.start_distance / data.track_length * 100,
      };
    });
  }, [data]);

  return (
    <div className="apex-card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Mini-Sector Analysis</h3>
        <span className="text-sm text-gray-400">{data.num_sectors} sectors</span>
      </div>
      
      {/* Track visualization */}
      <div className="relative h-16 bg-dark-800 rounded-lg overflow-hidden mb-6">
        <div className="absolute inset-0 flex">
          {trackSegments.map((segment, idx) => (
            <div
              key={idx}
              className="h-full border-r border-dark-700 flex items-center justify-center relative group cursor-pointer"
              style={{ 
                width: `${segment.width}%`,
                backgroundColor: segment.fastest_color + '40',
              }}
              title={`Sector ${segment.sector}: ${segment.fastest_driver}`}
            >
              {segment.width > 3 && (
                <span className="text-xs font-bold" style={{ color: segment.fastest_color }}>
                  {segment.fastest_driver.slice(0, 3)}
                </span>
              )}
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="bg-dark-900 border border-dark-600 rounded p-2 text-xs whitespace-nowrap">
                  <p className="font-bold" style={{ color: segment.fastest_color }}>
                    {segment.fastest_driver}
                  </p>
                  <p className="text-gray-400">
                    {segment.fastest_time.toFixed(3)}s
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Distance markers */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-500">
          <span>0m</span>
          <span>{(data.track_length / 4).toFixed(0)}m</span>
          <span>{(data.track_length / 2).toFixed(0)}m</span>
          <span>{(data.track_length * 3/4).toFixed(0)}m</span>
          <span>{data.track_length.toFixed(0)}m</span>
        </div>
      </div>
      
      {/* Driver Dominance Ranking */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Driver Dominance</h4>
        <div className="space-y-2">
          {data.driver_dominance.slice(0, 5).map((driver, idx) => (
            <div key={driver.driver} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-yellow-500 text-black' : 
                idx === 1 ? 'bg-gray-400 text-black' :
                idx === 2 ? 'bg-amber-700 text-white' : 'bg-dark-700'
              }`}>
                {idx + 1}
              </span>
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: driver.color }}
              />
              <span className="font-medium w-12">{driver.driver}</span>
              <div className="flex-1 bg-dark-800 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full rounded-full flex items-center justify-end pr-2"
                  style={{ 
                    width: `${driver.percentage}%`,
                    backgroundColor: driver.color + '80',
                  }}
                >
                  <span className="text-xs font-mono">{driver.sectors_won}</span>
                </div>
              </div>
              <span className="text-sm text-gray-400 w-16 text-right">
                {driver.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Sector Detail Table (scrollable) */}
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-dark-900">
            <tr className="text-gray-400 text-left">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">Distance</th>
              <th className="py-2 px-2">Fastest</th>
              <th className="py-2 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {data.mini_sectors.map(sector => (
              <tr key={sector.sector} className="border-t border-dark-700 hover:bg-dark-800">
                <td className="py-2 px-2 font-mono">{sector.sector}</td>
                <td className="py-2 px-2 text-gray-400">
                  {sector.start_distance.toFixed(0)} - {sector.end_distance.toFixed(0)}m
                </td>
                <td className="py-2 px-2">
                  <span 
                    className="font-medium"
                    style={{ color: sector.fastest_color }}
                  >
                    {sector.fastest_driver}
                  </span>
                </td>
                <td className="py-2 px-2 font-mono text-green-400">
                  {sector.fastest_time.toFixed(3)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
