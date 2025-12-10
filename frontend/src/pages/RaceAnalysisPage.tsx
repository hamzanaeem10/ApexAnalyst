import { useMemo, useState } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import Plot from 'react-plotly.js';
import { useCurrentSession } from '../store/sessionStore';
import { useRaceAnalysis, useRaceGaps, useRaceDrivers } from '../hooks/useApi';
import SessionSelector from '../components/session/SessionSelector';
import RaceTraceChart from '../components/charts/RaceTraceChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import type { Data, Layout, Config } from 'plotly.js';

// Compound colors matching F1 official colors
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#FF3333',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#39B54A',
  WET: '#00BFFF',
  UNKNOWN: '#888888',
};

export default function RaceAnalysisPage() {
  const currentSession = useCurrentSession();
  const [benchmarkDriver, setBenchmarkDriver] = useState<string>('');
  
  const { 
    data: raceData, 
    isLoading, 
    error, 
    refetch 
  } = useRaceAnalysis(currentSession?.session_id);

  // Race Trace (Gap to Rival) data
  const { data: raceDrivers } = useRaceDrivers(currentSession?.session_id);
  const { 
    data: raceGapsData, 
    isLoading: gapsLoading 
  } = useRaceGaps(currentSession?.session_id, benchmarkDriver || raceDrivers?.[0]?.abbreviation);

  // Race Pace Box Plot Data
  const racePaceData = useMemo<Data[]>(() => {
    if (!raceData?.race_pace) return [];
    
    return raceData.race_pace.map((driver) => ({
      type: 'box' as const,
      y: driver.lap_times,
      name: driver.driver,
      marker: {
        color: raceData.driver_colors[driver.driver] || '#FFFFFF',
      },
      boxpoints: 'outliers' as const,
      jitter: 0.3,
      whiskerwidth: 0.5,
      line: { width: 1 },
    }));
  }, [raceData]);

  const racePaceLayout = useMemo<Partial<Layout>>(() => ({
    title: {
      text: `${raceData?.year || ''} ${raceData?.event_name || ''} - Race Pace`,
      font: { color: '#FFFFFF', size: 16 },
    },
    paper_bgcolor: '#1a1a2e',
    plot_bgcolor: '#1a1a2e',
    font: { color: '#FFFFFF' },
    yaxis: {
      title: { text: 'Lap Time (seconds)', font: { color: '#FFFFFF' } },
      gridcolor: '#333',
      autorange: 'reversed' as const,
    },
    xaxis: {
      gridcolor: '#333',
    },
    showlegend: false,
    margin: { t: 50, r: 20, b: 40, l: 60 },
  }), [raceData]);

  // Tyre Strategy Gantt-style Data
  const tyreStrategyData = useMemo<Data[]>(() => {
    if (!raceData?.tyre_strategies) return [];
    
    const traces: Data[] = [];
    
    // Create a trace for each compound type to allow proper legend
    const compounds = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];
    
    compounds.forEach((compound) => {
      const xVals: number[] = [];
      const yVals: string[] = [];
      const baseVals: number[] = [];
      
      raceData.tyre_strategies.forEach((driver) => {
        driver.stints.forEach((stint) => {
          if (stint.compound === compound) {
            xVals.push(stint.laps);
            yVals.push(driver.driver);
            baseVals.push(stint.start_lap - 1);
          }
        });
      });
      
      if (xVals.length > 0) {
        traces.push({
          type: 'bar' as const,
          orientation: 'h' as const,
          name: compound,
          x: xVals,
          y: yVals,
          marker: {
            color: COMPOUND_COLORS[compound],
            line: { color: '#333', width: 1 },
          },
          hovertemplate: '%{y}: %{x} laps (' + compound + ')<extra></extra>',
          base: baseVals,
        } as Data);
      }
    });
    
    return traces;
  }, [raceData]);

  const tyreStrategyLayout = useMemo<Partial<Layout>>(() => ({
    title: {
      text: `${raceData?.year || ''} ${raceData?.event_name || ''} - Tyre Strategies`,
      font: { color: '#FFFFFF', size: 16 },
    },
    paper_bgcolor: '#1a1a2e',
    plot_bgcolor: '#1a1a2e',
    font: { color: '#FFFFFF' },
    barmode: 'stack' as const,
    xaxis: {
      title: { text: 'Lap Number', font: { color: '#FFFFFF' } },
      gridcolor: '#333',
      range: [0, raceData?.total_laps || 70],
    },
    yaxis: {
      gridcolor: '#333',
      autorange: 'reversed' as const,
    },
    legend: {
      orientation: 'h' as const,
      y: -0.15,
      x: 0.5,
      xanchor: 'center' as const,
    },
    margin: { t: 50, r: 20, b: 70, l: 60 },
  }), [raceData]);

  // Position Standings Data
  const positionData = useMemo<Data[]>(() => {
    if (!raceData?.positions) return [];
    
    return raceData.positions.map((driver) => ({
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: driver.driver,
      x: driver.positions.map((p) => p.lap),
      y: driver.positions.map((p) => p.position),
      line: {
        color: raceData.driver_colors[driver.driver] || '#FFFFFF',
        width: 2,
      },
      hovertemplate: `${driver.driver}: P%{y} (Lap %{x})<extra></extra>`,
    }));
  }, [raceData]);

  const positionLayout = useMemo<Partial<Layout>>(() => ({
    title: {
      text: `${raceData?.year || ''} ${raceData?.event_name || ''} - Standings`,
      font: { color: '#FFFFFF', size: 16 },
    },
    paper_bgcolor: '#1a1a2e',
    plot_bgcolor: '#1a1a2e',
    font: { color: '#FFFFFF' },
    xaxis: {
      title: { text: 'Lap Number', font: { color: '#FFFFFF' } },
      gridcolor: '#333',
      range: [0, raceData?.total_laps || 70],
    },
    yaxis: {
      title: { text: 'Position', font: { color: '#FFFFFF' } },
      gridcolor: '#333',
      autorange: 'reversed' as const,
      dtick: 1,
      range: [0.5, 20.5],
    },
    showlegend: true,
    legend: {
      orientation: 'v' as const,
      x: 1.02,
      y: 1,
      font: { size: 10 },
    },
    margin: { t: 50, r: 100, b: 40, l: 60 },
  }), [raceData]);

  // Gap Analysis Data
  const gapData = useMemo<Data[]>(() => {
    if (!raceData?.gap_analysis) return [];
    
    const sortedGaps = [...raceData.gap_analysis].sort((a, b) => a.gap - b.gap);
    
    return [{
      type: 'bar' as const,
      orientation: 'h' as const,
      y: sortedGaps.map((d) => d.driver),
      x: sortedGaps.map((d) => d.gap),
      marker: {
        color: sortedGaps.map((d) => 
          raceData.driver_colors[d.driver] || '#FFFFFF'
        ),
        line: { color: '#333', width: 1 },
      },
      text: sortedGaps.map((d) => d.gap.toFixed(3) + 's'),
      textposition: 'outside' as const,
      textfont: { color: '#FFFFFF', size: 10 },
      hovertemplate: '%{y}: +%{x:.3f}s<extra></extra>',
    }];
  }, [raceData]);

  const gapLayout = useMemo<Partial<Layout>>(() => ({
    title: {
      text: `${raceData?.year || ''} ${raceData?.event_name || ''} - Average gap to ${raceData?.fastest_driver || 'leader'}`,
      font: { color: '#FFFFFF', size: 16 },
    },
    paper_bgcolor: '#1a1a2e',
    plot_bgcolor: '#1a1a2e',
    font: { color: '#FFFFFF' },
    xaxis: {
      title: { text: 'Gap (seconds)', font: { color: '#FFFFFF' } },
      gridcolor: '#333',
    },
    yaxis: {
      gridcolor: '#333',
      autorange: 'reversed' as const,
    },
    showlegend: false,
    margin: { t: 50, r: 80, b: 40, l: 60 },
  }), [raceData]);

  const plotConfig: Partial<Config> = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  if (!currentSession) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-8 h-8 text-f1-red" />
          <h1 className="text-2xl font-bold">Race Analysis</h1>
        </div>
        <SessionSelector />
        <div className="apex-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session Required</h3>
          <p className="text-gray-400">Please load a race session to view analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-f1-red" />
        <div>
          <h1 className="text-2xl font-bold">Race Analysis</h1>
          <p className="text-gray-400 text-sm">
            {currentSession.grand_prix} - {currentSession.session_name}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <LoadingSpinner message="Loading race analysis data..." />
      )}

      {/* Error State */}
      {error && (
        <ErrorDisplay
          title="Failed to load race analysis"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {/* Race Trace Chart (Gap to Rival) */}
      {raceData && (
        <div className="space-y-4">
          <div className="apex-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Race Trace - Gap to Rival</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Benchmark Driver:</label>
                <select
                  value={benchmarkDriver || raceDrivers?.[0]?.abbreviation || ''}
                  onChange={(e) => setBenchmarkDriver(e.target.value)}
                  className="apex-select text-sm py-1 px-2 w-28"
                >
                  {raceDrivers?.map((driver) => (
                    <option key={driver.abbreviation} value={driver.abbreviation}>
                      P{driver.position} {driver.abbreviation}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {gapsLoading ? (
              <LoadingSpinner message="Loading race trace data..." size="sm" />
            ) : raceGapsData ? (
              <RaceTraceChart data={raceGapsData} height={450} />
            ) : null}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {raceData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Race Pace Box Plot */}
          <div className="apex-card p-4">
            <Plot
              data={racePaceData}
              layout={racePaceLayout}
              config={plotConfig}
              style={{ width: '100%', height: '400px' }}
              useResizeHandler
            />
          </div>

          {/* Tyre Strategies */}
          <div className="apex-card p-4">
            <Plot
              data={tyreStrategyData}
              layout={tyreStrategyLayout}
              config={plotConfig}
              style={{ width: '100%', height: '400px' }}
              useResizeHandler
            />
          </div>

          {/* Average Gap */}
          <div className="apex-card p-4">
            <Plot
              data={gapData}
              layout={gapLayout}
              config={plotConfig}
              style={{ width: '100%', height: '400px' }}
              useResizeHandler
            />
          </div>

          {/* Position Standings */}
          <div className="apex-card p-4">
            <Plot
              data={positionData}
              layout={positionLayout}
              config={plotConfig}
              style={{ width: '100%', height: '400px' }}
              useResizeHandler
            />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {raceData && (
        <div className="apex-card p-6">
          <h3 className="text-lg font-semibold mb-4">Race Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-f1-gray/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Laps</p>
              <p className="text-2xl font-bold">{raceData.total_laps}</p>
            </div>
            <div className="bg-f1-gray/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Fastest Average Pace</p>
              <p className="text-2xl font-bold">{raceData.fastest_driver}</p>
              <p className="text-sm text-gray-400">{raceData.fastest_avg_time.toFixed(3)}s</p>
            </div>
            <div className="bg-f1-gray/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Drivers</p>
              <p className="text-2xl font-bold">{raceData.race_pace.length}</p>
            </div>
            <div className="bg-f1-gray/20 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Event</p>
              <p className="text-xl font-bold">{raceData.event_name}</p>
              <p className="text-sm text-gray-400">{raceData.year}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
