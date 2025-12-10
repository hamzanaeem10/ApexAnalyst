import { useState, useMemo } from 'react';
import { Layers, AlertCircle, TrendingUp, Clock, Gauge, Zap, Target } from 'lucide-react';
import Plot from 'react-plotly.js';
import { useCurrentSession } from '../store/sessionStore';
import { 
  useSegmentAnalysis, 
  useTrackInfo, 
  useMiniSectors, 
  useTheoreticalBest, 
  useSpeedTrace,
  useCornerAnalysis,
  useSectorConsistency
} from '../hooks/useApi';
import SessionSelector from '../components/session/SessionSelector';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatCard from '../components/common/StatCard';
import ApexDataTable from '../components/tables/ApexDataTable';
import MiniSectorChart from '../components/charts/MiniSectorChart';
import TheoreticalBestChart from '../components/charts/TheoreticalBestChart';
import SectorConsistencyChart from '../components/charts/SectorConsistencyChart';
import SpeedTraceChart from '../components/charts/SpeedTraceChart';
import CornerAnalysisChart from '../components/charts/CornerAnalysisChart';
import { plotlyDarkLayout, plotlyConfig } from '../utils/helpers';
import type { SegmentAnalysisRequest, SegmentLeaderboardEntry, TeamDistribution } from '../types';
import type { ColumnDef } from '@tanstack/react-table';
import type { Data, Layout } from 'plotly.js';

interface TrackInfoResponse {
  session_id: string;
  track_name: string;
  location: string;
  country: string;
  track_length: number;
  suggested_segments: { name: string; start: number; end: number }[];
}

export default function SegmentsPage() {
  const currentSession = useCurrentSession();
  const [segmentStart, setSegmentStart] = useState<number>(0);
  const [segmentEnd, setSegmentEnd] = useState<number>(500);
  const [teamFilter] = useState<string[]>([]);
  const [shouldAnalyze, setShouldAnalyze] = useState(false);
  const [activeTab, setActiveTab] = useState<'segment' | 'advanced'>('advanced');
  const [cornerDistance, setCornerDistance] = useState<number>(500);
  const [selectedDrivers, setSelectedDrivers] = useState<string>('');

  // Get track info for segment suggestions
  const { data: trackInfo } = useTrackInfo(currentSession?.session_id) as { data: TrackInfoResponse | undefined };

  // Advanced segment hooks
  const { data: miniSectors, isLoading: miniSectorsLoading } = useMiniSectors(
    activeTab === 'advanced' ? currentSession?.session_id : undefined
  );
  const { data: theoreticalBest, isLoading: theoreticalLoading } = useTheoreticalBest(
    activeTab === 'advanced' ? currentSession?.session_id : undefined
  );
  const { data: sectorConsistency, isLoading: sectorConsistencyLoading } = useSectorConsistency(
    activeTab === 'advanced' ? currentSession?.session_id : undefined
  );
  const { data: speedTrace, isLoading: speedTraceLoading } = useSpeedTrace(
    activeTab === 'advanced' && selectedDrivers ? currentSession?.session_id : undefined,
    selectedDrivers
  );
  const { data: cornerAnalysis, isLoading: cornerLoading } = useCornerAnalysis(
    activeTab === 'advanced' && cornerDistance > 0 ? currentSession?.session_id : undefined,
    cornerDistance
  );

  const advancedLoading = miniSectorsLoading || theoreticalLoading || sectorConsistencyLoading;

  // Available drivers from mini-sector data
  const availableDrivers = useMemo(() => {
    if (!miniSectors) return [];
    return miniSectors.driver_dominance.map(d => d.driver);
  }, [miniSectors]);

  // Build request when user clicks analyze
  const segmentRequest: SegmentAnalysisRequest | null = useMemo(() => {
    if (!currentSession || !shouldAnalyze || segmentEnd <= segmentStart) return null;
    return {
      session_id: currentSession.session_id,
      start_dist: segmentStart,
      end_dist: segmentEnd,
      team_filter: teamFilter.length > 0 ? teamFilter : undefined,
    };
  }, [currentSession, shouldAnalyze, segmentStart, segmentEnd, teamFilter]);

  const { 
    data: segmentData, 
    isLoading: segmentLoading, 
    error: segmentError,
    refetch 
  } = useSegmentAnalysis(segmentRequest);

  // Leaderboard table columns
  const leaderboardColumns: ColumnDef<SegmentLeaderboardEntry>[] = useMemo(() => [
    {
      accessorKey: 'rank',
      header: 'Rank',
      cell: ({ row }) => (
        <span className={row.original.rank <= 3 ? 'text-yellow-400 font-bold' : ''}>
          {row.original.rank}
        </span>
      ),
    },
    {
      accessorKey: 'driver_name',
      header: 'Driver',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: row.original.team_color }}
          />
          <span className="font-medium">{row.original.driver_name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'team',
      header: 'Team',
      cell: ({ row }) => (
        <span className="text-gray-400">{row.original.team}</span>
      ),
    },
    {
      accessorKey: 'segment_time',
      header: 'Segment Time',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.segment_time.toFixed(3)}s</span>
      ),
    },
    {
      accessorKey: 'speed_delta',
      header: 'Delta',
      cell: ({ row }) => {
        const delta = row.original.speed_delta;
        if (delta === 0) return <span className="font-mono text-green-400">Leader</span>;
        return (
          <span className="font-mono text-red-400">+{delta.toFixed(3)}s</span>
        );
      },
    },
    {
      accessorKey: 'avg_speed',
      header: 'Avg Speed',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.avg_speed.toFixed(1)} km/h</span>
      ),
    },
    {
      accessorKey: 'max_speed',
      header: 'Max Speed',
      cell: ({ row }) => (
        <span className="font-mono text-green-400">{row.original.max_speed.toFixed(1)} km/h</span>
      ),
    },
    {
      accessorKey: 'min_speed',
      header: 'Min Speed',
      cell: ({ row }) => (
        <span className="font-mono text-red-400">{row.original.min_speed.toFixed(1)} km/h</span>
      ),
    },
  ], []);

  // Team distribution columns
  const teamDistColumns: ColumnDef<TeamDistribution>[] = useMemo(() => [
    {
      accessorKey: 'team',
      header: 'Team',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: row.original.team_color }}
          />
          <span className="font-medium">{row.original.team}</span>
        </div>
      ),
    },
    {
      accessorKey: 'mean_time',
      header: 'Mean Time',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.mean_time.toFixed(3)}s</span>
      ),
    },
    {
      accessorKey: 'min_time',
      header: 'Best',
      cell: ({ row }) => (
        <span className="font-mono text-green-400">{row.original.min_time.toFixed(3)}s</span>
      ),
    },
    {
      accessorKey: 'max_time',
      header: 'Worst',
      cell: ({ row }) => (
        <span className="font-mono text-red-400">{row.original.max_time.toFixed(3)}s</span>
      ),
    },
    {
      accessorKey: 'std_dev',
      header: 'Consistency (σ)',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.std_dev.toFixed(3)}s</span>
      ),
    },
  ], []);

  // Speed trace chart
  const speedTraceChart: Data[] = useMemo(() => {
    if (!segmentData?.speed_traces) return [];
    
    return segmentData.speed_traces.map((driver) => ({
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `${driver.driver_name}${driver.is_leader ? ' (Leader)' : ''}`,
      x: driver.speed_trace.map(p => p.distance),
      y: driver.speed_trace.map(p => p.speed),
      line: { 
        color: driver.team_color, 
        width: driver.is_leader ? 3 : 2,
        dash: driver.is_leader ? 'solid' : undefined,
      },
    }));
  }, [segmentData]);

  const speedTraceLayout: Partial<Layout> = {
    ...plotlyDarkLayout,
    title: { text: 'Speed Trace Through Segment', font: { size: 16, color: '#F5F5F5' } },
    xaxis: { ...plotlyDarkLayout.xaxis, title: { text: 'Distance (m)', font: { size: 12 } } },
    yaxis: { ...plotlyDarkLayout.yaxis, title: { text: 'Speed (km/h)', font: { size: 12 } } },
    height: 400,
    autosize: true,
    showlegend: true,
    legend: { orientation: 'h', y: -0.2 },
  };

  const handleAnalyze = () => {
    if (segmentEnd > segmentStart) {
      setShouldAnalyze(true);
    }
  };

  // Reset analyze flag when segment changes
  const handleSegmentChange = (start: number, end: number) => {
    setSegmentStart(start);
    setSegmentEnd(end);
    setShouldAnalyze(false);
  };

  // Select a suggested segment
  const selectSuggestedSegment = (start: number, end: number) => {
    setSegmentStart(Math.round(start));
    setSegmentEnd(Math.round(end));
    setShouldAnalyze(false);
  };

  if (!currentSession) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-8 h-8 text-f1-red" />
          <h1 className="text-2xl font-bold">Circuit Segment Analysis</h1>
        </div>
        <SessionSelector />
        <div className="apex-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session Required</h3>
          <p className="text-gray-400">Please load a session to analyze segment data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-8 h-8 text-f1-red" />
          <div>
            <h1 className="text-2xl font-bold">Circuit Segment Analysis</h1>
            <p className="text-gray-400 text-sm">
              {currentSession.grand_prix} - {currentSession.session_name}
            </p>
          </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'advanced' 
                ? 'bg-f1-red text-white' 
                : 'bg-dark-800 text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Advanced Analysis
          </button>
          <button
            onClick={() => setActiveTab('segment')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'segment' 
                ? 'bg-f1-red text-white' 
                : 'bg-dark-800 text-gray-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Segment Compare
          </button>
        </div>
      </div>

      {/* Advanced Segment Analysis */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {advancedLoading && <LoadingSpinner message="Loading segment analysis..." />}
          
          {/* Mini-Sectors */}
          {miniSectors && (
            <div className="apex-card p-4">
              <h3 className="text-lg font-semibold mb-4">🎯 Mini-Sector Analysis</h3>
              <MiniSectorChart data={miniSectors} />
            </div>
          )}
          
          {/* Theoretical Best Lap */}
          {theoreticalBest && (
            <div className="apex-card p-4">
              <h3 className="text-lg font-semibold mb-4">⚡ Theoretical Best Lap</h3>
              <TheoreticalBestChart data={theoreticalBest} />
            </div>
          )}

          {/* Sector Consistency */}
          {sectorConsistency && (
            <div className="apex-card p-4">
              <h3 className="text-lg font-semibold mb-4">📊 Sector Consistency</h3>
              <SectorConsistencyChart data={sectorConsistency} />
            </div>
          )}
          
          {/* Speed Trace Overlay */}
          <div className="apex-card p-4">
            <h3 className="text-lg font-semibold mb-4">🏎️ Speed Trace Overlay</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Select Drivers (comma-separated)
              </label>
              <input
                type="text"
                value={selectedDrivers}
                onChange={(e) => setSelectedDrivers(e.target.value)}
                placeholder="e.g., VER,HAM,LEC"
                className="apex-input w-full max-w-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {availableDrivers.join(', ')}
              </p>
            </div>
            {speedTraceLoading && <LoadingSpinner message="Loading speed traces..." />}
            {speedTrace && <SpeedTraceChart data={speedTrace} />}
            {!selectedDrivers && (
              <p className="text-gray-400 text-center py-4">Enter driver codes to compare speed traces</p>
            )}
          </div>

          {/* Corner Analysis */}
          <div className="apex-card p-4">
            <h3 className="text-lg font-semibold mb-4">🔄 Corner-by-Corner Analysis</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Corner Distance (m)
              </label>
              <input
                type="number"
                value={cornerDistance}
                onChange={(e) => setCornerDistance(Number(e.target.value))}
                min={0}
                max={trackInfo?.track_length || 5000}
                className="apex-input w-32"
              />
              {trackInfo?.suggested_segments && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {trackInfo.suggested_segments.slice(0, 6).map((seg, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCornerDistance(Math.round(seg.start))}
                      className={`px-2 py-1 text-xs rounded border ${
                        cornerDistance === Math.round(seg.start)
                          ? 'bg-f1-red border-f1-red'
                          : 'border-dark-700 hover:border-f1-red'
                      }`}
                    >
                      {seg.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {cornerLoading && <LoadingSpinner message="Analyzing corner..." />}
            {cornerAnalysis && <CornerAnalysisChart data={cornerAnalysis} />}
          </div>
        </div>
      )}

      {/* Classic Segment Analysis */}
      {activeTab === 'segment' && (
        <>
      {/* Track Info */}
      {trackInfo && (
        <div className="dashboard-grid">
          <StatCard
            title="Circuit"
            value={trackInfo.track_name}
            icon={Layers}
            color="red"
          />
          <StatCard
            title="Track Length"
            value={`${(trackInfo.track_length / 1000).toFixed(3)} km`}
            color="blue"
          />
          <StatCard
            title="Location"
            value={trackInfo.location}
            subtitle={trackInfo.country}
            color="green"
          />
        </div>
      )}

      {/* Segment Selection */}
      <div className="apex-card p-6">
        <h3 className="text-lg font-semibold mb-4">Select Segment to Analyze</h3>
        
        {/* Manual Input */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Start Distance (m)
            </label>
            <input
              type="number"
              value={segmentStart}
              onChange={(e) => handleSegmentChange(Number(e.target.value), segmentEnd)}
              min={0}
              max={trackInfo?.track_length || 5000}
              className="apex-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              End Distance (m)
            </label>
            <input
              type="number"
              value={segmentEnd}
              onChange={(e) => handleSegmentChange(segmentStart, Number(e.target.value))}
              min={segmentStart + 1}
              max={trackInfo?.track_length || 5000}
              className="apex-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Segment Length
            </label>
            <div className="h-[42px] flex items-center text-lg font-mono">
              {segmentEnd - segmentStart}m
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={segmentEnd <= segmentStart}
              className="apex-btn apex-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Analyze Segment
            </button>
          </div>
        </div>

        {/* Suggested Segments */}
        {trackInfo?.suggested_segments && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Quick Select Segment
            </label>
            <div className="flex flex-wrap gap-2">
              {trackInfo.suggested_segments.map((seg, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestedSegment(seg.start, seg.end)}
                  className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                    segmentStart === Math.round(seg.start) && segmentEnd === Math.round(seg.end)
                      ? 'bg-f1-red border-f1-red text-white'
                      : 'border-f1-gray text-gray-300 hover:border-f1-red'
                  }`}
                >
                  {seg.name} ({Math.round(seg.start)}-{Math.round(seg.end)}m)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {segmentLoading && (
        <LoadingSpinner message="Analyzing segment performance..." />
      )}

      {segmentError && (
        <ErrorDisplay
          title="Failed to analyze segment"
          message={segmentError.message}
          onRetry={() => refetch()}
        />
      )}

      {segmentData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="dashboard-grid">
            <StatCard
              title="Segment"
              value={`${segmentData.segment_start.toFixed(0)}-${segmentData.segment_end.toFixed(0)}m`}
              icon={Layers}
              color="red"
            />
            <StatCard
              title="Length"
              value={`${segmentData.segment_length.toFixed(0)}m`}
              icon={TrendingUp}
              color="blue"
            />
            <StatCard
              title="Leader"
              value={segmentData.leaderboard[0]?.driver_name || '-'}
              subtitle={`${segmentData.leaderboard[0]?.segment_time.toFixed(3)}s`}
              icon={Clock}
              color="green"
            />
            <StatCard
              title="Top Speed"
              value={`${Math.max(...segmentData.leaderboard.map(d => d.max_speed)).toFixed(1)}`}
              subtitle="km/h"
              icon={Gauge}
              color="purple"
            />
          </div>

          {/* Speed Trace Chart */}
          {segmentData.speed_traces.length > 0 && (
            <div className="apex-card p-4">
              <Plot
                data={speedTraceChart}
                layout={speedTraceLayout}
                config={plotlyConfig}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          )}

          {/* Leaderboard */}
          <ApexDataTable
            data={segmentData.leaderboard}
            columns={leaderboardColumns}
            title="Segment Leaderboard"
            searchable={true}
            searchPlaceholder="Search driver..."
          />

          {/* Team Distribution */}
          {segmentData.team_distributions.length > 0 && (
            <ApexDataTable
              data={segmentData.team_distributions}
              columns={teamDistColumns}
              title="Team Performance Distribution"
            />
          )}
        </div>
      )}

      {!segmentData && !segmentLoading && (
        <div className="apex-card p-8 text-center">
          <Layers className="w-12 h-12 mx-auto text-f1-gray mb-4" />
          <h3 className="text-lg font-semibold mb-2">Configure Segment</h3>
          <p className="text-gray-400">
            Set start and end distances above to analyze driver performance through that segment.
          </p>
        </div>
      )}
        </>
      )}
    </div>
  );
}
