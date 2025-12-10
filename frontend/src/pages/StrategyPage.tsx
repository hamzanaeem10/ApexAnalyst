import { useState, useMemo } from 'react';
import { Target, TrendingUp, Clock, Trophy } from 'lucide-react';
import { useHistoricalStrategy, useRaces } from '../hooks/useApi';
import ApexDataTable from '../components/tables/ApexDataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatCard from '../components/common/StatCard';
import { getAvailableSeasons } from '../utils/helpers';
import type { HistoricalStrategyRequest, StrategyEntry, PitStopData, StrategyEfficiency, RaceInfo } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

export default function StrategyPage() {
  const seasons = useMemo(() => getAvailableSeasons(), []);
  
  const [selectedYear, setSelectedYear] = useState(seasons[0]);
  const [selectedRound, setSelectedRound] = useState<number>(0);
  const [shouldFetch, setShouldFetch] = useState(false);

  // Get races for selected year
  const { data: racesData, isLoading: racesLoading } = useRaces(selectedYear);

  // Build request only when user clicks Analyze
  const strategyRequest: HistoricalStrategyRequest | null = useMemo(() => {
    if (!shouldFetch || selectedRound === 0) return null;
    return {
      year: selectedYear,
      race_round: selectedRound,
      strategy_filter: ['1-stop', '2-stop'],
      pit_time_loss: 22.0,
    };
  }, [shouldFetch, selectedYear, selectedRound]);

  const { 
    data: strategyData, 
    isLoading: strategyLoading, 
    error: strategyError,
    refetch 
  } = useHistoricalStrategy(strategyRequest);

  // Strategy table columns
  const strategyColumns: ColumnDef<StrategyEntry>[] = useMemo(() => [
    {
      accessorKey: 'position',
      header: 'Pos',
      cell: ({ row }) => (
        <span className={row.original.position <= 3 ? 'text-yellow-400 font-bold' : ''}>
          P{row.original.position}
        </span>
      ),
    },
    {
      accessorKey: 'driver_name',
      header: 'Driver',
      cell: ({ row }) => <span className="font-medium">{row.original.driver_name}</span>,
    },
    {
      accessorKey: 'team',
      header: 'Team',
      cell: ({ row }) => <span className="text-gray-400">{row.original.team}</span>,
    },
    {
      accessorKey: 'strategy_type',
      header: 'Strategy',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs ${
          row.original.strategy_type === '1-stop' ? 'bg-green-500/20 text-green-400' :
          row.original.strategy_type === '2-stop' ? 'bg-blue-500/20 text-blue-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {row.original.strategy_type}
        </span>
      ),
    },
    {
      accessorKey: 'num_stops',
      header: 'Stops',
      cell: ({ row }) => <span className="font-mono">{row.original.num_stops}</span>,
    },
    {
      accessorKey: 'pit_stop_laps',
      header: 'Pit Laps',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-gray-400">
          {row.original.pit_stop_laps.join(', ') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'avg_lap_time',
      header: 'Avg Lap',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.avg_lap_time.toFixed(3)}s</span>
      ),
    },
    {
      accessorKey: 'best_lap_time',
      header: 'Best Lap',
      cell: ({ row }) => (
        <span className="font-mono text-green-400">{row.original.best_lap_time.toFixed(3)}s</span>
      ),
    },
  ], []);

  // Pit stop table columns
  const pitStopColumns: ColumnDef<PitStopData>[] = useMemo(() => [
    {
      accessorKey: 'driver_id',
      header: 'Driver',
      cell: ({ row }) => <span className="font-medium">{row.original.driver_id}</span>,
    },
    {
      accessorKey: 'stop_number',
      header: 'Stop #',
      cell: ({ row }) => <span className="font-mono">{row.original.stop_number}</span>,
    },
    {
      accessorKey: 'lap',
      header: 'Lap',
      cell: ({ row }) => <span className="font-mono">{row.original.lap}</span>,
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => (
        <span className={`font-mono ${
          row.original.duration < 25 ? 'text-green-400' : 
          row.original.duration > 30 ? 'text-red-400' : ''
        }`}>
          {row.original.duration.toFixed(1)}s
        </span>
      ),
    },
  ], []);

  // Efficiency table columns
  const efficiencyColumns: ColumnDef<StrategyEfficiency>[] = useMemo(() => [
    {
      accessorKey: 'strategy_type',
      header: 'Strategy',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs ${
          row.original.strategy_type === '1-stop' ? 'bg-green-500/20 text-green-400' :
          row.original.strategy_type === '2-stop' ? 'bg-blue-500/20 text-blue-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {row.original.strategy_type}
        </span>
      ),
    },
    {
      accessorKey: 'driver_count',
      header: 'Drivers',
      cell: ({ row }) => <span className="font-mono">{row.original.driver_count}</span>,
    },
    {
      accessorKey: 'avg_pace',
      header: 'Avg Pace',
      cell: ({ row }) => <span className="font-mono">{row.original.avg_pace.toFixed(3)}s</span>,
    },
    {
      accessorKey: 'total_pit_time_loss',
      header: 'Pit Time Loss',
      cell: ({ row }) => (
        <span className="font-mono text-yellow-400">+{row.original.total_pit_time_loss.toFixed(1)}s</span>
      ),
    },
    {
      accessorKey: 'delta_to_optimal',
      header: 'Delta to Optimal',
      cell: ({ row }) => {
        const delta = row.original.delta_to_optimal;
        return (
          <span className={`font-mono ${delta <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta <= 0 ? '' : '+'}{delta.toFixed(2)}s
          </span>
        );
      },
    },
  ], []);

  const handleAnalyze = () => {
    if (selectedRound > 0) {
      setShouldFetch(true);
    }
  };

  // Reset fetch state when year/round changes
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setSelectedRound(0);
    setShouldFetch(false);
  };

  const handleRoundChange = (round: number) => {
    setSelectedRound(round);
    setShouldFetch(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Target className="w-8 h-8 text-f1-red" />
        <div>
          <h1 className="text-2xl font-bold">Historical Strategy Analysis</h1>
          <p className="text-gray-400 text-sm">
            Analyze pit stop strategies and efficiency across different races
          </p>
        </div>
      </div>

      {/* Search Controls */}
      <div className="apex-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Season</label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="apex-select"
            >
              {seasons.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Race</label>
            {racesLoading ? (
              <div className="h-[42px] flex items-center text-gray-400">Loading races...</div>
            ) : (
              <select
                value={selectedRound}
                onChange={(e) => handleRoundChange(Number(e.target.value))}
                className="apex-select"
              >
                <option value={0}>Select a race...</option>
                {racesData?.races?.map((race: RaceInfo) => (
                  <option key={race.round} value={race.round}>
                    R{race.round}: {race.race_name} ({race.circuit})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={selectedRound === 0}
              className="apex-btn apex-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Analyze Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {strategyLoading && (
        <LoadingSpinner message="Analyzing race strategy data..." />
      )}

      {strategyError && (
        <ErrorDisplay
          title="Failed to load strategy data"
          message={strategyError.message}
          onRetry={() => refetch()}
        />
      )}

      {strategyData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="dashboard-grid">
            <StatCard
              title="Race"
              value={strategyData.race_name}
              subtitle={`${strategyData.year}`}
              icon={Target}
              color="red"
            />
            <StatCard
              title="Winner"
              value={strategyData.winner}
              icon={Trophy}
              color="yellow"
            />
            <StatCard
              title="Finishers"
              value={strategyData.total_finishers}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              title="Pit Stops"
              value={strategyData.pit_stops.length}
              subtitle="Total stops"
              icon={Clock}
              color="blue"
            />
          </div>

          {/* Strategy Efficiency Comparison */}
          {strategyData.efficiency_data.length > 0 && (
            <ApexDataTable
              data={strategyData.efficiency_data}
              columns={efficiencyColumns}
              title="Strategy Efficiency Comparison"
            />
          )}

          {/* Driver Strategy Table */}
          <ApexDataTable
            data={strategyData.strategy_table}
            columns={strategyColumns}
            title="Driver Strategies"
            searchable={true}
            searchPlaceholder="Search driver..."
          />

          {/* Pit Stop Details */}
          {strategyData.pit_stops.length > 0 && (
            <ApexDataTable
              data={strategyData.pit_stops.sort((a, b) => a.lap - b.lap)}
              columns={pitStopColumns}
              title="Pit Stop Timeline"
            />
          )}

          {/* Lap Progression Chart Placeholder */}
          {Object.keys(strategyData.lap_progression).length > 0 && (
            <div className="apex-card p-6">
              <h3 className="text-lg font-semibold mb-4">Lap Progression Data Available</h3>
              <p className="text-gray-400">
                {Object.keys(strategyData.lap_progression).length} drivers have lap-by-lap data
              </p>
            </div>
          )}
        </div>
      )}

      {!strategyData && !strategyLoading && (
        <div className="apex-card p-8 text-center">
          <Target className="w-12 h-12 mx-auto text-f1-gray mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Race</h3>
          <p className="text-gray-400">
            Choose a season and race to analyze historical pit stop strategies and efficiency.
          </p>
        </div>
      )}
    </div>
  );
}
