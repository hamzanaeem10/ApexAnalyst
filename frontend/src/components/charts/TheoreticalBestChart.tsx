// Theoretical Best Lap Chart
import type { TheoreticalBestResponse } from '../../services/api';

interface TheoreticalBestChartProps {
  data: TheoreticalBestResponse;
}

export default function TheoreticalBestChart({ data }: TheoreticalBestChartProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  return (
    <div className="apex-card p-4">
      <h3 className="text-lg font-semibold mb-4">Theoretical Best Lap</h3>
      
      {/* Main comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-900/50 to-dark-800 p-4 rounded-lg border border-purple-500/30">
          <p className="text-purple-400 text-sm mb-1">Theoretical Best</p>
          <p className="text-3xl font-mono font-bold text-purple-300">
            {formatTime(data.theoretical_best_time)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Combined best sectors</p>
        </div>
        
        <div className="bg-dark-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm mb-1">Actual Best</p>
          <p className="text-3xl font-mono font-bold">
            {data.actual_best_time ? formatTime(data.actual_best_time) : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {data.actual_best_driver || 'No valid lap'}
          </p>
        </div>
        
        <div className="bg-dark-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm mb-1">Time on Table</p>
          <p className={`text-3xl font-mono font-bold ${data.time_on_table && data.time_on_table > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {data.time_on_table ? `+${data.time_on_table.toFixed(3)}s` : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Potential improvement</p>
        </div>
      </div>
      
      {/* Sector breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Theoretical Lap Composition</h4>
        <div className="flex gap-2">
          {data.sector_components.map(sector => (
            <div 
              key={sector.sector}
              className="flex-1 p-3 rounded-lg text-center"
              style={{ backgroundColor: sector.color + '20', borderLeft: `3px solid ${sector.color}` }}
            >
              <p className="text-xs text-gray-400">Sector {sector.sector}</p>
              <p className="font-mono font-bold" style={{ color: sector.color }}>
                {sector.time.toFixed(3)}s
              </p>
              <p className="text-xs mt-1" style={{ color: sector.color }}>
                {sector.driver}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Driver theoretical times */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Driver Theoretical Bests</h4>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-dark-900">
              <tr className="text-gray-400 text-left">
                <th className="py-2 px-2">#</th>
                <th className="py-2 px-2">Driver</th>
                <th className="py-2 px-2">S1</th>
                <th className="py-2 px-2">S2</th>
                <th className="py-2 px-2">S3</th>
                <th className="py-2 px-2">Theoretical</th>
                <th className="py-2 px-2">Delta</th>
              </tr>
            </thead>
            <tbody>
              {data.driver_theoretical_bests.map((driver, idx) => (
                <tr 
                  key={driver.driver} 
                  className={`border-t border-dark-700 ${idx === 0 ? 'bg-purple-900/20' : 'hover:bg-dark-800'}`}
                >
                  <td className="py-2 px-2 font-mono">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: driver.color }}
                      />
                      <span className="font-medium">{driver.driver}</span>
                    </div>
                  </td>
                  {driver.sector_times.map((time, sIdx) => (
                    <td key={sIdx} className="py-2 px-2 font-mono text-gray-400">
                      {time.toFixed(3)}
                    </td>
                  ))}
                  <td className="py-2 px-2 font-mono font-bold">
                    {formatTime(driver.theoretical_time)}
                  </td>
                  <td className={`py-2 px-2 font-mono ${driver.delta_to_overall > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {driver.delta_to_overall > 0 ? '+' : ''}{driver.delta_to_overall.toFixed(3)}
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
