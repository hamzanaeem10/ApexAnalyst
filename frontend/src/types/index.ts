// ============================================================================
// SESSION TYPES
// ============================================================================

export interface SessionLoadRequest {
  year: number;
  grand_prix: string;
  session_name: 'FP1' | 'FP2' | 'FP3' | 'Q' | 'R' | 'S' | 'SQ';
}

export interface DriverInfo {
  driver_id: string;
  abbreviation: string;
  full_name: string;
  team_name: string;
  team_color: string;
  driver_number: number;
}

export interface TeamInfo {
  team_id: string;
  name: string;
  color: string;
  drivers: string[];
}

export interface TrackPoint {
  x: number;
  y: number;
}

export interface SegmentDefinition {
  name: string;
  start_distance: number;
  end_distance: number;
}

export interface TrackData {
  track_name: string;
  track_length: number;
  track_path: TrackPoint[];
  segment_definitions: SegmentDefinition[];
}

export interface SessionLoadResponse {
  session_id: string;
  year: number;
  grand_prix: string;
  session_name: string;
  event_name?: string;  // Alias for grand_prix for backwards compatibility
  drivers: DriverInfo[];
  teams: TeamInfo[];
  track_data: TrackData;
}

export interface EventScheduleItem {
  round_number: number;
  event_name: string;
  country: string;
  location: string;
  event_date: string;
  event_format: string;
}

export interface ScheduleResponse {
  year: number;
  events: EventScheduleItem[];
}

// ============================================================================
// TELEMETRY TYPES
// ============================================================================

export interface TelemetryCompareRequest {
  session_id: string;
  driver_id_1: string;
  driver_id_2: string;
  lap_number_1?: number;
  lap_number_2?: number;
  start_dist?: number;
  end_dist?: number;
}

export interface TelemetryPoint {
  distance: number;
  time: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm?: number;
  drs?: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  speed: number;
}

export interface DriverTelemetry {
  driver_id: string;
  driver_name: string;
  team_color: string;
  lap_number: number;
  lap_time: number;
  telemetry: TelemetryPoint[];
  trajectory: TrajectoryPoint[];
  min_speed: number;
  max_speed: number;
  avg_speed: number;
}

// Delta-T data for cumulative time loss visualization
export interface DeltaTPoint {
  distance: number;
  delta: number;
  time_1: number;
  time_2: number;
}

// Track map data point with coordinates and telemetry
export interface TrackMapPoint {
  x: number;
  y: number;
  distance: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
}

// Track map visualization data
export interface TrackMapData {
  driver_1: TrackMapPoint[];
  driver_2: TrackMapPoint[];
  track_path: TrackPoint[];
  speed_range?: { min: number; max: number };
  gear_range?: { min: number; max: number };
}

export interface TelemetryCompareResponse {
  driver_1: DriverTelemetry;
  driver_2: DriverTelemetry;
  speed_delta: number;
  segment_info?: Record<string, number>;
  delta_t?: DeltaTPoint[];  // Cumulative time difference along distance
  track_map?: TrackMapData;  // Track coordinates with speed/gear data
}

// ============================================================================
// RACE GAP TYPES
// ============================================================================

export interface LapGap {
  lap: number;
  gap: number;
  lap_delta?: number;
}

export interface DriverGapData {
  driver: string;
  color: string;
  is_benchmark: boolean;
  gaps: LapGap[];
  final_gap: number;
}

export interface RaceGapsRequest {
  session_id: string;
  benchmark_driver: string;
  drivers?: string;
}

export interface RaceGapsResponse {
  event_name: string;
  year: number;
  benchmark_driver: string;
  total_laps: number;
  driver_gaps: DriverGapData[];
  driver_colors: Record<string, string>;
}

export interface RaceDriver {
  abbreviation: string;
  full_name: string;
  team: string;
  color: string;
  position: number;
}

// ============================================================================
// LAP PERFORMANCE TYPES
// ============================================================================

export interface LapPerformanceRequest {
  session_id: string;
  driver_id: string;
}

export interface SectorDelta {
  sector: number;
  driver_time: number;
  session_best: number;
  delta: number;
}

export interface StintData {
  stint_number: number;
  compound: string;
  compound_color: string;
  start_lap: number;
  end_lap: number;
  total_laps: number;
  degradation_rate?: number;
  r_squared?: number;
  lap_times: Array<{lap_number: number; lap_time: number; is_accurate: boolean}>;
}

export interface LapPerformanceResponse {
  driver_id: string;
  driver_name: string;
  team_color: string;
  theoretical_lap: number;
  actual_best_lap: number;
  time_lost: number;
  time_lost_percent: number;
  best_sectors: Record<string, number>;
  sector_deltas: SectorDelta[];
  stint_summary: StintData[];
}

export interface LapSummary {
  driver: string;
  fastest_lap: number;
  average_lap: number;
  total_laps: number;
  position: number;
}

// ============================================================================
// WEATHER TYPES
// ============================================================================

export interface WeatherCorrelationRequest {
  session_id: string;
  lap_window_size?: number;
  min_laps?: number;
}

export interface CorrelationPoint {
  track_temp: number;
  air_temp: number;
  humidity: number;
  avg_lap_time: number;
  window_start_lap: number;
  window_end_lap: number;
}

export interface TemperaturePoint {
  time_minutes: number;
  track_temp: number;
  air_temp: number;
  humidity?: number;
}

export interface WeatherImpactMetric {
  variable: string;
  delta_per_unit: number;
  unit: string;
  r_squared: number;
  direction: string;
}

export interface WeatherCorrelationResponse {
  correlation_data: CorrelationPoint[];
  temperature_evolution: TemperaturePoint[];
  impact_metrics: WeatherImpactMetric[];
  rainfall_detected: boolean;
  temp_range: Record<string, number>;
}

// ============================================================================
// HISTORICAL STRATEGY TYPES
// ============================================================================

export interface HistoricalStrategyRequest {
  year: number;
  race_round: number;
  strategy_filter?: string[];
  pit_time_loss?: number;
}

export interface StrategyEntry {
  driver_id: string;
  driver_name: string;
  position: number;
  team: string;
  strategy_type: string;
  num_stops: number;
  avg_lap_time: number;
  best_lap_time: number;
  total_laps: number;
  pit_stop_laps: number[];
}

export interface StrategyEfficiency {
  strategy_type: string;
  driver_count: number;
  avg_pace: number;
  total_pit_time_loss: number;
  estimated_race_time: number;
  delta_to_optimal: number;
}

export interface PitStopData {
  driver_id: string;
  stop_number: number;
  lap: number;
  duration: number;
}

export interface HistoricalStrategyResponse {
  race_name: string;
  year: number;
  winner: string;
  total_finishers: number;
  strategy_table: StrategyEntry[];
  efficiency_data: StrategyEfficiency[];
  pit_stops: PitStopData[];
  lap_progression: Record<string, Array<Record<string, any>>>;
}

export interface RaceInfo {
  year: number;
  round: number;
  race_name: string;
  grand_prix: string;
  circuit: string;
  date: string;
  winner: string;
}

export interface RacesResponse {
  year: number;
  races: RaceInfo[];
}

// ============================================================================
// SEGMENT ANALYSIS TYPES
// ============================================================================

export interface SegmentAnalysisRequest {
  session_id: string;
  start_dist: number;
  end_dist: number;
  team_filter?: string[];
}

export interface SegmentLeaderboardEntry {
  rank: number;
  driver_id: string;
  driver_name: string;
  team: string;
  team_color: string;
  avg_speed: number;
  max_speed: number;
  min_speed: number;
  segment_time: number;
  speed_delta: number;
}

export interface TeamDistribution {
  team: string;
  team_color: string;
  segment_times: number[];
  mean_time: number;
  std_dev: number;
  min_time: number;
  max_time: number;
}

export interface SpeedTracePoint {
  distance: number;
  speed: number;
}

export interface DriverSpeedTrace {
  driver_id: string;
  driver_name: string;
  team: string;
  team_color: string;
  is_leader: boolean;
  speed_trace: SpeedTracePoint[];
}

export interface SegmentAnalysisResponse {
  segment_start: number;
  segment_end: number;
  segment_length: number;
  leaderboard: SegmentLeaderboardEntry[];
  team_distributions: TeamDistribution[];
  speed_traces: DriverSpeedTrace[];
}

export interface TrackInfo {
  circuit_name: string;
  track_length: number;
  corners: number;
  drs_zones: number;
  lap_record: string;
  lap_record_holder: string;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ErrorResponse {
  error: string;
  detail: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

// Store Types
export interface SessionState {
  currentSession: SessionLoadResponse | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: SessionLoadResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;
}

// Chart Types
export interface ChartConfig {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  showLegend: boolean;
  height?: number;
}

export interface PlotlyTrace {
  x: number[];
  y: number[];
  name: string;
  type: string;
  mode?: string;
  line?: {
    color?: string;
    width?: number;
    dash?: string;
  };
  marker?: {
    color?: string;
    size?: number;
  };
}

// Legacy Types for Chart Components (Deprecated - from Streamlit version)
// These are kept for backwards compatibility with existing chart components
export interface LapInfo {
  lap_number: number;
  lap_time: number;
  sector_1: number;
  sector_2: number;
  sector_3: number;
  compound?: string;
}

export interface StintInfo {
  stint_number: number;
  start_lap: number;
  end_lap: number;
  compound: string;
  avg_lap_time: number;
}

export interface DriverLapData {
  driver: string;
  team: string;
  team_color: string;
  laps: LapInfo[];
  stints: StintInfo[];
}

export interface PitStopInfo {
  lap: number;
  duration: number;
  tyre_from: string;
  tyre_to: string;
  position_before: number;
  position_after: number;
}

export interface DriverStrategy {
  driver: string;
  team: string;
  finish_position: number;
  dnf: boolean;
  pit_stops: PitStopInfo[];
  compounds_used: string[];
  stint_lengths: number[];
  total_pit_time: number;
}
