import { useMemo } from 'react';
import { Cloud, AlertCircle, Droplets, Thermometer, Wind } from 'lucide-react';
import Plot from 'react-plotly.js';
import { useCurrentSession } from '../store/sessionStore';
import { useWeatherCorrelation } from '../hooks/useApi';
import SessionSelector from '../components/session/SessionSelector';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatCard from '../components/common/StatCard';
import { plotlyDarkLayout, plotlyConfig } from '../utils/helpers';
import type { WeatherCorrelationRequest } from '../types';
import type { Data, Layout } from 'plotly.js';

export default function WeatherPage() {
  const currentSession = useCurrentSession();

  const weatherRequest: WeatherCorrelationRequest | null = useMemo(() => {
    if (!currentSession) return null;
    return {
      session_id: currentSession.session_id,
      lap_window_size: 5,
      min_laps: 5,
    };
  }, [currentSession]);

  const { 
    data: weatherData, 
    isLoading: weatherLoading, 
    error: weatherError,
    refetch 
  } = useWeatherCorrelation(weatherRequest);

  // Temperature evolution chart traces
  const tempTraces: Data[] = useMemo(() => {
    if (!weatherData) return [];
    return [
      {
        x: weatherData.temperature_evolution.map((w) => w.time_minutes),
        y: weatherData.temperature_evolution.map((w) => w.track_temp),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Track Temp (°C)',
        line: { color: '#FF8700', width: 2 },
      },
      {
        x: weatherData.temperature_evolution.map((w) => w.time_minutes),
        y: weatherData.temperature_evolution.map((w) => w.air_temp),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Air Temp (°C)',
        line: { color: '#00D2BE', width: 2 },
      },
    ];
  }, [weatherData]);

  // Correlation scatter plot
  const correlationTraces: Data[] = useMemo(() => {
    if (!weatherData) return [];
    return [
      {
        x: weatherData.correlation_data.map((c) => c.track_temp),
        y: weatherData.correlation_data.map((c) => c.avg_lap_time),
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: 'Track Temp vs Lap Time',
        marker: { color: '#FF8700', size: 10 },
      },
    ];
  }, [weatherData]);

  const tempLayout: Partial<Layout> = {
    ...plotlyDarkLayout,
    title: { text: 'Temperature Evolution', font: { color: '#F5F5F5', size: 16 } },
    xaxis: { ...plotlyDarkLayout.xaxis, title: { text: 'Session Time (minutes)', font: { size: 12 } } },
    yaxis: { ...plotlyDarkLayout.yaxis, title: { text: 'Temperature (°C)', font: { size: 12 } } },
    height: 400,
  };

  const correlationLayout: Partial<Layout> = {
    ...plotlyDarkLayout,
    title: { text: 'Track Temperature vs Lap Time', font: { color: '#F5F5F5', size: 16 } },
    xaxis: { ...plotlyDarkLayout.xaxis, title: { text: 'Track Temperature (°C)', font: { size: 12 } } },
    yaxis: { ...plotlyDarkLayout.yaxis, title: { text: 'Average Lap Time (s)', font: { size: 12 } } },
    height: 400,
  };

  if (!currentSession) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Cloud className="w-8 h-8 text-f1-red" />
          <h1 className="text-2xl font-bold">Weather Impact Analysis</h1>
        </div>
        <SessionSelector />
        <div className="apex-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session Required</h3>
          <p className="text-gray-400">Please load a session to analyze weather data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Cloud className="w-8 h-8 text-f1-red" />
        <div>
          <h1 className="text-2xl font-bold">Weather Impact Analysis</h1>
          <p className="text-gray-400 text-sm">
            {currentSession.grand_prix} - {currentSession.session_name}
          </p>
        </div>
      </div>

      {/* Results */}
      {weatherLoading && (
        <LoadingSpinner message="Loading weather data..." />
      )}

      {weatherError && (
        <ErrorDisplay
          title="Failed to load weather data"
          message={weatherError.message}
          onRetry={() => refetch()}
        />
      )}

      {weatherData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="dashboard-grid">
            <StatCard
              title="Track Temp Range"
              value={`${weatherData.temp_range.track_min?.toFixed(1) || '-'} - ${weatherData.temp_range.track_max?.toFixed(1) || '-'}°C`}
              icon={Thermometer}
              color="red"
            />
            <StatCard
              title="Air Temp Range"
              value={`${weatherData.temp_range.air_min?.toFixed(1) || '-'} - ${weatherData.temp_range.air_max?.toFixed(1) || '-'}°C`}
              icon={Wind}
              color="blue"
            />
            <StatCard
              title="Rainfall"
              value={weatherData.rainfall_detected ? 'Yes' : 'No'}
              icon={Droplets}
              color={weatherData.rainfall_detected ? 'blue' : 'green'}
            />
            <StatCard
              title="Data Points"
              value={weatherData.correlation_data.length}
              subtitle="Weather samples"
              icon={Cloud}
              color="purple"
            />
          </div>

          {/* Temperature Evolution Chart */}
          <div className="apex-card p-6">
            <Plot
              data={tempTraces}
              layout={tempLayout}
              config={plotlyConfig}
              className="w-full"
            />
          </div>

          {/* Correlation Chart */}
          <div className="apex-card p-6">
            <Plot
              data={correlationTraces}
              layout={correlationLayout}
              config={plotlyConfig}
              className="w-full"
            />
          </div>

          {/* Impact Metrics */}
          {weatherData.impact_metrics.length > 0 && (
            <div className="apex-card p-6">
              <h3 className="text-lg font-semibold mb-4">Weather Impact on Lap Times</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weatherData.impact_metrics.map((metric, idx) => (
                  <div key={idx} className="bg-f1-gray/30 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{metric.variable}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Impact per {metric.unit}:</span>
                        <span className={metric.direction === 'faster' ? 'text-green-400' : 'text-red-400'}>
                          {metric.delta_per_unit > 0 ? '+' : ''}{metric.delta_per_unit.toFixed(3)}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Direction:</span>
                        <span className={metric.direction === 'faster' ? 'text-green-400' : 'text-red-400'}>
                          {metric.direction}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">R² (correlation):</span>
                        <span>{(metric.r_squared * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correlation Data Table */}
          <div className="apex-card p-6">
            <h3 className="text-lg font-semibold mb-4">Correlation Data Points</h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-f1-dark">
                  <tr className="border-b border-f1-gray/30">
                    <th className="text-left py-2 px-3">Lap Window</th>
                    <th className="text-right py-2 px-3">Track Temp (°C)</th>
                    <th className="text-right py-2 px-3">Air Temp (°C)</th>
                    <th className="text-right py-2 px-3">Humidity (%)</th>
                    <th className="text-right py-2 px-3">Avg Lap Time</th>
                  </tr>
                </thead>
                <tbody>
                  {weatherData.correlation_data.map((row, idx) => (
                    <tr key={idx} className="border-b border-f1-gray/20">
                      <td className="py-2 px-3">{row.window_start_lap} - {row.window_end_lap}</td>
                      <td className="py-2 px-3 text-right font-mono">{row.track_temp.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono">{row.air_temp.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono">{row.humidity.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right font-mono">{row.avg_lap_time.toFixed(3)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
