import { useState, useMemo } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { useCurrentSession } from '../store/sessionStore';
import { useDrivers, useTelemetryComparison } from '../hooks/useApi';
import SessionSelector from '../components/session/SessionSelector';
import TelemetryChart from '../components/charts/TelemetryChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { getDriverColor } from '../utils/helpers';
import type { Data } from 'plotly.js';
import type { TelemetryCompareRequest } from '../types';

export default function TelemetryPage() {
  const currentSession = useCurrentSession();
  const [selectedDriver1, setSelectedDriver1] = useState<string>('');
  const [selectedDriver2, setSelectedDriver2] = useState<string>('');
  const [selectedLap1, setSelectedLap1] = useState<number | undefined>(undefined);
  const [selectedLap2, setSelectedLap2] = useState<number | undefined>(undefined);

  const { data: drivers, isLoading: driversLoading } = useDrivers(currentSession?.session_id);

  const telemetryRequest: TelemetryCompareRequest | null = useMemo(() => {
    if (!currentSession || !selectedDriver1 || !selectedDriver2) return null;
    return {
      session_id: currentSession.session_id,
      driver_id_1: selectedDriver1,
      driver_id_2: selectedDriver2,
      lap_number_1: selectedLap1,
      lap_number_2: selectedLap2,
    };
  }, [currentSession, selectedDriver1, selectedDriver2, selectedLap1, selectedLap2]);

  const { 
    data: telemetryData, 
    isLoading: telemetryLoading, 
    error: telemetryError,
    refetch 
  } = useTelemetryComparison(telemetryRequest);

  // Helper to get both drivers as array
  const driversData = useMemo(() => {
    if (!telemetryData) return [];
    return [telemetryData.driver_1, telemetryData.driver_2];
  }, [telemetryData]);

  // Generate chart traces for speed
  const speedTraces: Data[] = useMemo(() => {
    return driversData.map((driver) => ({
      x: driver.telemetry.map((p) => p.distance),
      y: driver.telemetry.map((p) => p.speed),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: driver.driver_id,
      line: { color: driver.team_color || getDriverColor(driver.driver_id), width: 2 },
    }));
  }, [driversData]);

  // Generate chart traces for throttle
  const throttleTraces: Data[] = useMemo(() => {
    return driversData.map((driver) => ({
      x: driver.telemetry.map((p) => p.distance),
      y: driver.telemetry.map((p) => p.throttle),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: driver.driver_id,
      line: { color: driver.team_color || getDriverColor(driver.driver_id), width: 2 },
    }));
  }, [driversData]);

  // Generate chart traces for brake
  const brakeTraces: Data[] = useMemo(() => {
    return driversData.map((driver) => ({
      x: driver.telemetry.map((p) => p.distance),
      y: driver.telemetry.map((p) => p.brake),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: driver.driver_id,
      line: { color: driver.team_color || getDriverColor(driver.driver_id), width: 2 },
    }));
  }, [driversData]);

  // Gear traces
  const gearTraces: Data[] = useMemo(() => {
    return driversData.map((driver) => ({
      x: driver.telemetry.map((p) => p.distance),
      y: driver.telemetry.map((p) => p.gear),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: driver.driver_id,
      line: { color: driver.team_color || getDriverColor(driver.driver_id), width: 2 },
    }));
  }, [driversData]);

  if (!currentSession) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-8 h-8 text-f1-red" />
          <h1 className="text-2xl font-bold">Telemetry Comparison</h1>
        </div>
        <SessionSelector />
        <div className="apex-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session Required</h3>
          <p className="text-gray-400">Please load a session to view telemetry data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-f1-red" />
        <div>
          <h1 className="text-2xl font-bold">Telemetry Comparison</h1>
          <p className="text-gray-400 text-sm">
            {currentSession.grand_prix} - {currentSession.session_name}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="apex-card p-6">
        <div className="space-y-6">
          {/* Driver Selection */}
          {driversLoading ? (
            <LoadingSpinner message="Loading drivers..." size="sm" />
          ) : drivers ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Driver 1
                </label>
                <select
                  value={selectedDriver1}
                  onChange={(e) => setSelectedDriver1(e.target.value)}
                  className="apex-select"
                >
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Driver 2
                </label>
                <select
                  value={selectedDriver2}
                  onChange={(e) => setSelectedDriver2(e.target.value)}
                  className="apex-select"
                >
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {/* Lap Selection */}
          {(selectedDriver1 || selectedDriver2) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Lap for Driver 1 (optional - defaults to fastest)
                </label>
                <input
                  type="number"
                  value={selectedLap1 || ''}
                  onChange={(e) => setSelectedLap1(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Fastest lap"
                  min={1}
                  className="apex-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Lap for Driver 2 (optional - defaults to fastest)
                </label>
                <input
                  type="number"
                  value={selectedLap2 || ''}
                  onChange={(e) => setSelectedLap2(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Fastest lap"
                  min={1}
                  className="apex-input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {telemetryLoading && (
        <LoadingSpinner message="Loading telemetry data..." />
      )}

      {telemetryError && (
        <ErrorDisplay
          title="Failed to load telemetry"
          message={telemetryError.message}
          onRetry={() => refetch()}
        />
      )}

      {telemetryData && (
        <div className="space-y-6">
          {/* Speed Chart */}
          <TelemetryChart
            title="Speed Comparison"
            data={speedTraces}
            xAxisLabel="Distance (m)"
            yAxisLabel="Speed (km/h)"
            height={400}
          />

          {/* Throttle & Brake Charts */}
          <div className="chart-grid">
            <TelemetryChart
              title="Throttle Application"
              data={throttleTraces}
              xAxisLabel="Distance (m)"
              yAxisLabel="Throttle (%)"
              height={350}
            />
            <TelemetryChart
              title="Brake Application"
              data={brakeTraces}
              xAxisLabel="Distance (m)"
              yAxisLabel="Brake (%)"
              height={350}
            />
          </div>

          {/* Gear Chart */}
          <TelemetryChart
            title="Gear Selection"
            data={gearTraces}
            xAxisLabel="Distance (m)"
            yAxisLabel="Gear"
            height={300}
          />

          {/* Lap Info */}
          <div className="apex-card p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">LAP INFORMATION</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {driversData.map((driver) => (
                <div key={driver.driver_id} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: driver.team_color || getDriverColor(driver.driver_id) }}
                  />
                  <div>
                    <p className="font-semibold">{driver.driver_id}</p>
                    <p className="text-sm text-gray-400">
                      Lap {driver.lap_number} - {(driver.lap_time).toFixed(3)}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {telemetryData && (
              <div className="mt-4 pt-4 border-t border-f1-gray/30">
                <p className="text-sm text-gray-400">
                  Time Delta: <span className={telemetryData.speed_delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {telemetryData.speed_delta >= 0 ? '+' : ''}{telemetryData.speed_delta.toFixed(3)}s
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {(!selectedDriver1 || !selectedDriver2) && !telemetryLoading && (
        <div className="apex-card p-8 text-center">
          <Activity className="w-12 h-12 mx-auto text-f1-gray mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select Two Drivers</h3>
          <p className="text-gray-400">
            Choose two drivers above to compare their telemetry data.
          </p>
        </div>
      )}
    </div>
  );
}
