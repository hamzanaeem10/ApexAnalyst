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

export default api;
