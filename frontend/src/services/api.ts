import axios from 'axios';
import type {
  SessionLoadRequest,
  SessionLoadResponse,
  ScheduleResponse,
  TelemetryCompareRequest,
  TelemetryCompareResponse,
  LapPerformanceRequest,
  LapPerformanceResponse,
  LapSummary,
  WeatherCorrelationRequest,
  WeatherCorrelationResponse,
  HistoricalStrategyRequest,
  HistoricalStrategyResponse,
  RacesResponse,
  SegmentAnalysisRequest,
  SegmentAnalysisResponse,
  TrackInfo,
  RaceGapsResponse,
  RaceDriver,
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes timeout for data-heavy operations
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    console.error(`[API Error] ${message}`);
    return Promise.reject(new Error(message));
  }
);

// ==================== Session API ====================
// Session loading status type
export interface SessionStatus {
  session_id: string;
  state: 'pending' | 'loading_basic' | 'loading_laps' | 'loading_telemetry' | 'ready' | 'error';
  full_telemetry_loaded: boolean;
  loaded_at: string | null;
}

export const sessionApi = {
  loadSession: async (request: SessionLoadRequest): Promise<SessionLoadResponse> => {
    const { data } = await api.post<SessionLoadResponse>('/session/load', request);
    return data;
  },

  getSchedule: async (year: number): Promise<ScheduleResponse> => {
    const { data } = await api.get<ScheduleResponse>(`/session/schedule/${year}`);
    return data;
  },

  getSessionStatus: async (sessionId: string): Promise<SessionStatus> => {
    const { data } = await api.get<SessionStatus>(`/telemetry/status/${sessionId}`);
    return data;
  },
};

// ==================== Telemetry API ====================

// Race Analysis Response Type
export interface RaceAnalysisResponse {
  event_name: string;
  year: number;
  total_laps: number;
  race_pace: Array<{
    driver: string;
    lap_times: number[];
    min: number;
    max: number;
    median: number;
    q1: number;
    q3: number;
    mean: number;
  }>;
  tyre_strategies: Array<{
    driver: string;
    stints: Array<{
      compound: string;
      start_lap: number;
      end_lap: number;
      laps: number;
    }>;
    total_laps: number;
  }>;
  positions: Array<{
    driver: string;
    positions: Array<{
      lap: number;
      position: number;
    }>;
  }>;
  gap_analysis: Array<{
    driver: string;
    gap: number;
    avg_lap_time: number;
    is_fastest: boolean;
  }>;
  fastest_driver: string;
  fastest_avg_time: number;
  driver_colors: Record<string, string>;
}

export const telemetryApi = {
  compareTelemetry: async (request: TelemetryCompareRequest): Promise<TelemetryCompareResponse> => {
    const { session_id, ...body } = request;
    const { data } = await api.post<TelemetryCompareResponse>(`/telemetry/compare?session_id=${session_id}`, body);
    return data;
  },

  getDrivers: async (sessionId: string): Promise<string[]> => {
    const { data } = await api.get<string[]>(`/telemetry/drivers/${sessionId}`);
    return data;
  },

  getDriverLaps: async (sessionId: string, driverId: string) => {
    const { data } = await api.get(`/telemetry/laps/${sessionId}?driver_id=${driverId}`);
    return data;
  },

  getRaceAnalysis: async (sessionId: string): Promise<RaceAnalysisResponse> => {
    const { data } = await api.get<RaceAnalysisResponse>(`/telemetry/race-analysis/${sessionId}`);
    return data;
  },
};

// ==================== Lap API ====================
export const lapApi = {
  getLapPerformance: async (request: LapPerformanceRequest): Promise<LapPerformanceResponse> => {
    const { session_id, ...body } = request;
    const { data } = await api.post<LapPerformanceResponse>(`/lap/performance?session_id=${session_id}`, body);
    return data;
  },

  getLapSummary: async (sessionId: string): Promise<LapSummary[]> => {
    const { data } = await api.get<LapSummary[]>(`/lap/summary/${sessionId}`);
    return data;
  },
};

// ==================== Weather API ====================
export const weatherApi = {
  getWeatherCorrelation: async (request: WeatherCorrelationRequest): Promise<WeatherCorrelationResponse> => {
    const { session_id, ...body } = request;
    const { data } = await api.post<WeatherCorrelationResponse>(`/weather/correlation?session_id=${session_id}`, body);
    return data;
  },

  getRawWeather: async (sessionId: string): Promise<WeatherCorrelationResponse> => {
    const { data } = await api.get<WeatherCorrelationResponse>(`/weather/raw/${sessionId}`);
    return data;
  },
};

// ==================== Strategy API ====================
export const strategyApi = {
  getHistoricalStrategy: async (request: HistoricalStrategyRequest): Promise<HistoricalStrategyResponse> => {
    const { data } = await api.post<HistoricalStrategyResponse>('/strategy/historical', request);
    return data;
  },

  getRaces: async (year: number): Promise<RacesResponse> => {
    const { data } = await api.get<RacesResponse>(`/strategy/races/${year}`);
    return data;
  },
};

// ==================== Circuit API ====================
export const circuitApi = {
  getSegmentAnalysis: async (request: SegmentAnalysisRequest): Promise<SegmentAnalysisResponse> => {
    const { session_id, ...body } = request;
    const { data } = await api.post<SegmentAnalysisResponse>(`/circuit/segment?session_id=${session_id}`, body);
    return data;
  },

  getTrackInfo: async (sessionId: string): Promise<TrackInfo> => {
    const { data } = await api.get<TrackInfo>(`/circuit/track-info/${sessionId}`);
    return data;
  },
};

// ==================== Race API ====================
export const raceApi = {
  getRaceGaps: async (sessionId: string, benchmarkDriver: string, drivers?: string): Promise<RaceGapsResponse> => {
    const params = new URLSearchParams({ benchmark_driver: benchmarkDriver });
    if (drivers) params.append('drivers', drivers);
    const { data } = await api.get<RaceGapsResponse>(`/race/gaps/${sessionId}?${params.toString()}`);
    return data;
  },

  getRaceDrivers: async (sessionId: string): Promise<RaceDriver[]> => {
    const { data } = await api.get<RaceDriver[]>(`/race/drivers/${sessionId}`);
    return data;
  },
};

// ==================== Advanced Strategy API ====================
export interface TyreDegradationResponse {
  session_id: string;
  compounds: string[];
  degradation_curves: Record<string, {
    compound: string;
    color: string;
    degradation_rate: number;
    base_pace: number;
    r_squared: number;
    data_points: Array<{
      tyre_age: number;
      median_time: number;
      mean_time: number;
      std_dev: number;
      sample_count: number;
    }>;
    raw_data: Array<{
      driver: string;
      tyre_age: number;
      lap_time: number;
      lap_number: number;
    }>;
  }>;
  compound_colors: Record<string, string>;
}

export interface PitWindowResponse {
  session_id: string;
  driver: string;
  pit_time_loss: number;
  optimal_pit_lap: number | null;
  undercut_window: { start: number; end: number; recommendation: string } | null;
  overcut_window: { start: number; end: number; recommendation: string } | null;
  lap_analysis: Array<{
    lap: number;
    tyre_age: number;
    compound: string;
    cumulative_deg_loss: number;
    pit_time_loss: number;
    pit_beneficial: boolean;
    net_time: number;
  }>;
}

export interface PositionChangesResponse {
  session_id: string;
  total_laps: number;
  drivers: Array<{
    driver: string;
    color: string;
    start_position: number;
    end_position: number;
    positions_gained: number;
    positions: Array<{ lap: number; position: number }>;
  }>;
}

export interface FuelEffectResponse {
  session_id: string;
  total_laps: number;
  estimated_start_fuel_kg: number;
  fuel_consumption_per_lap_kg: number;
  time_improvement_per_kg: number;
  total_fuel_effect_seconds: number;
  fuel_effect: Array<{
    lap: number;
    fuel_remaining: number;
    fuel_burned: number;
    cumulative_time_gained: number;
    time_per_lap_faster: number;
  }>;
}

export interface SafetyCarResponse {
  session_id: string;
  circuit: string;
  total_laps: number;
  sc_laps: number[];
  vsc_laps: number[];
  sc_count: number;
  vsc_count: number;
  historical_sc_probability: number;
  strategy_recommendation: string;
}

export interface DRSTrainsResponse {
  session_id: string;
  total_laps: number;
  train_events: Array<{ lap: number; trains: string[][] }>;
  affected_drivers: Array<{
    driver: string;
    color: string;
    laps_in_train: number;
    percentage: number;
  }>;
  total_train_laps: number;
}

export const advancedStrategyApi = {
  getTyreDegradation: async (sessionId: string, drivers?: string): Promise<TyreDegradationResponse> => {
    const params = drivers ? `?drivers=${drivers}` : '';
    const { data } = await api.get<TyreDegradationResponse>(`/advanced-strategy/tyre-degradation/${sessionId}${params}`);
    return data;
  },

  getPitWindow: async (sessionId: string, driver: string, pitTimeLoss?: number): Promise<PitWindowResponse> => {
    const params = new URLSearchParams({ driver });
    if (pitTimeLoss) params.append('pit_time_loss', pitTimeLoss.toString());
    const { data } = await api.get<PitWindowResponse>(`/advanced-strategy/pit-window/${sessionId}?${params.toString()}`);
    return data;
  },

  getPositionChanges: async (sessionId: string): Promise<PositionChangesResponse> => {
    const { data } = await api.get<PositionChangesResponse>(`/advanced-strategy/position-changes/${sessionId}`);
    return data;
  },

  getFuelEffect: async (sessionId: string): Promise<FuelEffectResponse> => {
    const { data } = await api.get<FuelEffectResponse>(`/advanced-strategy/fuel-effect/${sessionId}`);
    return data;
  },

  getSafetyCarProbability: async (sessionId: string): Promise<SafetyCarResponse> => {
    const { data } = await api.get<SafetyCarResponse>(`/advanced-strategy/safety-car-probability/${sessionId}`);
    return data;
  },

  getDRSTrains: async (sessionId: string): Promise<DRSTrainsResponse> => {
    const { data } = await api.get<DRSTrainsResponse>(`/advanced-strategy/drs-trains/${sessionId}`);
    return data;
  },
};

// ==================== Advanced Weather API ====================
export interface WeatherTimelineResponse {
  session_id: string;
  data_points: number;
  duration_minutes: number;
  summary: {
    air_temp: { min: number | null; max: number | null; mean: number | null };
    track_temp: { min: number | null; max: number | null; mean: number | null };
    humidity: { min: number | null; max: number | null; mean: number | null };
    wind_speed: { min: number | null; max: number | null; mean: number | null };
    rainfall_detected: boolean;
  };
  rain_periods: Array<{ start: number; end: number }>;
  timeline: Array<{
    time_seconds: number;
    time_minutes: number;
    air_temp: number | null;
    track_temp: number | null;
    humidity: number | null;
    pressure: number | null;
    wind_speed: number | null;
    wind_direction: number | null;
    rainfall: boolean;
  }>;
}

export interface WindRoseResponse {
  session_id: string;
  total_samples: number;
  dominant_direction: string;
  avg_wind_speed: number;
  max_wind_speed: number;
  rose_data: Array<{
    direction: string;
    angle: number;
    count: number;
    percentage: number;
    avg_speed: number;
    max_speed: number;
    speed_distribution: Record<string, number>;
  }>;
}

export interface TrackEvolutionResponse {
  session_id: string;
  total_laps: number;
  evolution_rate_per_lap: number;
  evolution_trend: 'improving' | 'stable' | 'degrading';
  r_squared: number;
  fastest_lap_number: number;
  time_improvement: number;
  evolution: Array<{
    lap: number;
    median_lap_time: number;
    trend_time: number;
    delta_to_trend: number;
    grip_level: number;
  }>;
}

export interface WeatherLapImpactResponse {
  session_id: string;
  driver: string | null;
  data_points: number;
  correlations: Record<string, {
    correlation: number;
    p_value: number;
    significant: boolean;
  }>;
  impact_data: Array<{
    lap: number;
    driver: string;
    lap_time: number;
    track_temp: number | null;
    air_temp: number | null;
    humidity: number | null;
    wind_speed: number | null;
    rainfall: boolean;
  }>;
}

export const advancedWeatherApi = {
  getWeatherTimeline: async (sessionId: string): Promise<WeatherTimelineResponse> => {
    const { data } = await api.get<WeatherTimelineResponse>(`/advanced-weather/timeline/${sessionId}`);
    return data;
  },

  getWindRose: async (sessionId: string): Promise<WindRoseResponse> => {
    const { data } = await api.get<WindRoseResponse>(`/advanced-weather/wind-rose/${sessionId}`);
    return data;
  },

  getTrackEvolution: async (sessionId: string): Promise<TrackEvolutionResponse> => {
    const { data } = await api.get<TrackEvolutionResponse>(`/advanced-weather/track-evolution/${sessionId}`);
    return data;
  },

  getWeatherLapImpact: async (sessionId: string, driver?: string): Promise<WeatherLapImpactResponse> => {
    const params = driver ? `?driver=${driver}` : '';
    const { data } = await api.get<WeatherLapImpactResponse>(`/advanced-weather/weather-lap-impact/${sessionId}${params}`);
    return data;
  },
};

// ==================== Advanced Segments API ====================
export interface MiniSectorResponse {
  session_id: string;
  track_length: number;
  num_sectors: number;
  sector_length: number;
  mini_sectors: Array<{
    sector: number;
    start_distance: number;
    end_distance: number;
    fastest_driver: string;
    fastest_color: string;
    fastest_time: number;
    driver_times: Record<string, {
      time: number;
      avg_speed: number;
      delta: number;
      color: string;
    }>;
  }>;
  driver_dominance: Array<{
    driver: string;
    sectors_won: number;
    percentage: number;
    color: string;
  }>;
}

export interface TheoreticalBestResponse {
  session_id: string;
  theoretical_best_time: number;
  actual_best_time: number | null;
  actual_best_driver: string | null;
  time_on_table: number | null;
  sector_components: Array<{
    sector: number;
    driver: string;
    time: number;
    color: string;
  }>;
  driver_theoretical_bests: Array<{
    driver: string;
    color: string;
    theoretical_time: number;
    sector_times: number[];
    delta_to_overall: number;
  }>;
}

export interface SectorConsistencyResponse {
  session_id: string;
  drivers: Array<{
    driver: string;
    color: string;
    sectors: Record<string, {
      min: number;
      q1: number;
      median: number;
      q3: number;
      max: number;
      mean: number;
      std: number;
      count: number;
      all_times: number[];
    }>;
  }>;
}

export interface CornerAnalysisResponse {
  session_id: string;
  corner_distance: number;
  entry_distance: number;
  exit_distance: number;
  window_size: number;
  analysis: Array<{
    driver: string;
    color: string;
    entry_speed: number;
    min_speed: number;
    exit_speed: number;
    apex_distance: number;
    speed_loss: number;
    speed_gain: number;
    rank: number;
    delta_to_best: number;
  }>;
}

export interface SpeedTraceResponse {
  session_id: string;
  drivers: string[];
  start_distance: number | null;
  end_distance: number | null;
  speed_traces: Array<{
    driver: string;
    color: string;
    lap_time: number | null;
    data_points: number;
    trace: Array<{ distance: number; speed: number }>;
  }>;
}

export const advancedSegmentsApi = {
  getMiniSectors: async (sessionId: string, numSectors?: number): Promise<MiniSectorResponse> => {
    const params = numSectors ? `?num_sectors=${numSectors}` : '';
    const { data } = await api.get<MiniSectorResponse>(`/advanced-segments/mini-sectors/${sessionId}${params}`);
    return data;
  },

  getTheoreticalBest: async (sessionId: string): Promise<TheoreticalBestResponse> => {
    const { data } = await api.get<TheoreticalBestResponse>(`/advanced-segments/theoretical-best/${sessionId}`);
    return data;
  },

  getSectorConsistency: async (sessionId: string): Promise<SectorConsistencyResponse> => {
    const { data } = await api.get<SectorConsistencyResponse>(`/advanced-segments/sector-consistency/${sessionId}`);
    return data;
  },

  getCornerAnalysis: async (sessionId: string, cornerDistance: number, window?: number): Promise<CornerAnalysisResponse> => {
    const params = new URLSearchParams({ corner_distance: cornerDistance.toString() });
    if (window) params.append('window', window.toString());
    const { data } = await api.get<CornerAnalysisResponse>(`/advanced-segments/corner-analysis/${sessionId}?${params.toString()}`);
    return data;
  },

  getSpeedTrace: async (sessionId: string, drivers: string, startDist?: number, endDist?: number): Promise<SpeedTraceResponse> => {
    const params = new URLSearchParams({ drivers });
    if (startDist !== undefined) params.append('start_dist', startDist.toString());
    if (endDist !== undefined) params.append('end_dist', endDist.toString());
    const { data } = await api.get<SpeedTraceResponse>(`/advanced-segments/speed-trace/${sessionId}?${params.toString()}`);
    return data;
  },
};

export default api;
