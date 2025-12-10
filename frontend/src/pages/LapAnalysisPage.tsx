import { useState, useMemo } from 'react';
import { Timer, AlertCircle, TrendingUp, Clock, Gauge } from 'lucide-react';
import { useCurrentSession } from '../store/sessionStore';
import { useDrivers, useLapPerformance } from '../hooks/useApi';
import SessionSelector from '../components/session/SessionSelector';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import TyreBadge from '../components/common/TyreBadge';
import StatCard from '../components/common/StatCard';
import { formatLapTime } from '../utils/helpers';
import type { LapPerformanceRequest } from '../types';

export default function LapAnalysisPage() {
  const currentSession = useCurrentSession();
  const [selectedDriver, setSelectedDriver] = useState<string>('');

  const { data: drivers, isLoading: driversLoading } = useDrivers(currentSession?.session_id);

  const lapRequest: LapPerformanceRequest | null = useMemo(() => {
    if (!currentSession || !selectedDriver) return null;
    return {
      session_id: currentSession.session_id,
      driver_id: selectedDriver,
    };
  }, [currentSession, selectedDriver]);

  const { 
    data: lapData, 
    isLoading: lapLoading, 
    error: lapError,
    refetch 
  } = useLapPerformance(lapRequest);

  if (!currentSession) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Timer className="w-8 h-8 text-f1-red" />
          <h1 className="text-2xl font-bold">Lap Time Analysis</h1>
        </div>
        <SessionSelector />
        <div className="apex-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session Required</h3>
          <p className="text-gray-400">Please load a session to analyze lap times.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Timer className="w-8 h-8 text-f1-red" />
        <div>
          <h1 className="text-2xl font-bold">Lap Time Analysis</h1>
          <p className="text-gray-400 text-sm">
            {currentSession.grand_prix} - {currentSession.session_name}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="apex-card p-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Select Driver
          </label>
          {driversLoading ? (
            <LoadingSpinner message="Loading drivers..." size="sm" />
          ) : drivers ? (
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="apex-select max-w-xs"
            >
              <option value="">Select a driver</option>
              {drivers.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {/* Results */}
      {lapLoading && (
        <LoadingSpinner message="Loading lap performance data..." />
      )}

      {lapError && (
        <ErrorDisplay
          title="Failed to load lap data"
          message={lapError.message}
          onRetry={() => refetch()}
        />
      )}

      {lapData && (
        <div className="space-y-6">
          {/* Driver Header */}
          <div className="apex-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: lapData.team_color }}
              />
              <div>
                <h2 className="text-xl font-bold">{lapData.driver_name}</h2>
                <p className="text-gray-400">{lapData.driver_id}</p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="dashboard-grid">
            <StatCard
              title="Theoretical Best"
              value={formatLapTime(lapData.theoretical_lap)}
              subtitle="Sum of best sectors"
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              title="Actual Best"
              value={formatLapTime(lapData.actual_best_lap)}
              subtitle="Fastest lap"
              icon={Clock}
              color="blue"
            />
            <StatCard
              title="Time Lost"
              value={`+${lapData.time_lost.toFixed(3)}s`}
              subtitle={`${lapData.time_lost_percent.toFixed(1)}% slower`}
              icon={Timer}
              color="red"
            />
            <StatCard
              title="Stints"
              value={lapData.stint_summary.length}
              subtitle="Tire changes"
              icon={Gauge}
              color="purple"
            />
          </div>

          {/* Best Sectors */}
          <div className="apex-card p-6">
            <h3 className="text-lg font-semibold mb-4">Best Sectors</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(lapData.best_sectors).map(([sector, time]) => (
                <div key={sector} className="text-center p-4 bg-f1-gray/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">{sector}</p>
                  <p className="text-2xl font-mono font-bold text-purple-400">
                    {(time as number).toFixed(3)}s
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sector Deltas */}
          <div className="apex-card p-6">
            <h3 className="text-lg font-semibold mb-4">Sector Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-f1-gray/30">
                    <th className="text-left py-2 px-4 text-gray-400 font-medium">Sector</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-medium">Driver Time</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-medium">Session Best</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {lapData.sector_deltas.map((sector) => (
                    <tr key={sector.sector} className="border-b border-f1-gray/20">
                      <td className="py-3 px-4 font-medium">Sector {sector.sector}</td>
                      <td className="py-3 px-4 text-right font-mono">{sector.driver_time.toFixed(3)}s</td>
                      <td className="py-3 px-4 text-right font-mono text-purple-400">{sector.session_best.toFixed(3)}s</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${sector.delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {sector.delta > 0 ? '+' : ''}{sector.delta.toFixed(3)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stint Summary */}
          <div className="apex-card p-6">
            <h3 className="text-lg font-semibold mb-4">Stint Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lapData.stint_summary.map((stint) => (
                <div key={stint.stint_number} className="bg-f1-gray/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Stint {stint.stint_number}</span>
                    <TyreBadge compound={stint.compound} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Laps:</span>
                      <span>{stint.start_lap} - {stint.end_lap} ({stint.total_laps} laps)</span>
                    </div>
                    {stint.degradation_rate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Degradation:</span>
                        <span className={stint.degradation_rate > 0.05 ? 'text-red-400' : 'text-green-400'}>
                          +{stint.degradation_rate.toFixed(3)}s/lap
                        </span>
                      </div>
                    )}
                    {stint.r_squared && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">R² (fit quality):</span>
                        <span>{(stint.r_squared * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selectedDriver && !lapLoading && (
        <div className="apex-card p-8 text-center">
          <Timer className="w-12 h-12 mx-auto text-f1-gray mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Driver</h3>
          <p className="text-gray-400">
            Choose a driver to analyze their lap performance, sector times, and stint data.
          </p>
        </div>
      )}
    </div>
  );
}
