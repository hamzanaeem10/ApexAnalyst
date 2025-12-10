import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi, telemetryApi, lapApi, weatherApi, strategyApi, circuitApi } from '../services/api';
import { useSessionStore } from '../store/sessionStore';
import type {
  SessionLoadRequest,
  TelemetryCompareRequest,
  LapPerformanceRequest,
  WeatherCorrelationRequest,
  HistoricalStrategyRequest,
  SegmentAnalysisRequest,
} from '../types';

// Query Keys
export const queryKeys = {
  schedule: (year: number) => ['schedule', year] as const,
  session: (sessionId: string) => ['session', sessionId] as const,
  drivers: (sessionId: string) => ['drivers', sessionId] as const,
  telemetry: (request: TelemetryCompareRequest) => ['telemetry', request] as const,
  lapPerformance: (request: LapPerformanceRequest) => ['lapPerformance', request] as const,
  lapSummary: (sessionId: string) => ['lapSummary', sessionId] as const,
  weatherCorrelation: (request: WeatherCorrelationRequest) => ['weather', request] as const,
  rawWeather: (sessionId: string) => ['rawWeather', sessionId] as const,
  historicalStrategy: (request: HistoricalStrategyRequest) => ['strategy', request] as const,
  races: (year: number) => ['races', year] as const,
  segmentAnalysis: (request: SegmentAnalysisRequest) => ['segment', request] as const,
  trackInfo: (sessionId: string) => ['trackInfo', sessionId] as const,
};

// ==================== Session Hooks ====================
export function useSchedule(year: number) {
  return useQuery({
    queryKey: queryKeys.schedule(year),
    queryFn: () => sessionApi.getSchedule(year),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - schedule rarely changes
  });
}

export function useLoadSession() {
  const queryClient = useQueryClient();
  const { setSession, setLoading, setError } = useSessionStore();

  return useMutation({
    mutationFn: (request: SessionLoadRequest) => sessionApi.loadSession(request),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      setSession(data);
      setLoading(false);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['drivers', data.session_id] });
    },
    onError: (error: Error) => {
      setError(error.message);
      setLoading(false);
    },
  });
}

// ==================== Telemetry Hooks ====================
export function useDrivers(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.drivers(sessionId || ''),
    queryFn: () => telemetryApi.getDrivers(sessionId!),
    enabled: !!sessionId,
  });
}

export function useTelemetryComparison(request: TelemetryCompareRequest | null) {
  return useQuery({
    queryKey: queryKeys.telemetry(request!),
    queryFn: () => telemetryApi.compareTelemetry(request!),
    enabled: !!request && !!request.driver_id_1 && !!request.driver_id_2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== Lap Performance Hooks ====================
export function useLapPerformance(request: LapPerformanceRequest | null) {
  return useQuery({
    queryKey: queryKeys.lapPerformance(request!),
    queryFn: () => lapApi.getLapPerformance(request!),
    enabled: !!request && !!request.driver_id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLapSummary(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lapSummary(sessionId || ''),
    queryFn: () => lapApi.getLapSummary(sessionId!),
    enabled: !!sessionId,
  });
}

// ==================== Weather Hooks ====================
export function useWeatherCorrelation(request: WeatherCorrelationRequest | null) {
  return useQuery({
    queryKey: queryKeys.weatherCorrelation(request!),
    queryFn: () => weatherApi.getWeatherCorrelation(request!),
    enabled: !!request,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRawWeather(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.rawWeather(sessionId || ''),
    queryFn: () => weatherApi.getRawWeather(sessionId!),
    enabled: !!sessionId,
  });
}

// ==================== Strategy Hooks ====================
export function useHistoricalStrategy(request: HistoricalStrategyRequest | null) {
  return useQuery({
    queryKey: queryKeys.historicalStrategy(request!),
    queryFn: () => strategyApi.getHistoricalStrategy(request!),
    enabled: !!request,
    staleTime: 10 * 60 * 1000, // 10 minutes - historical data changes less
  });
}

export function useRaces(year: number) {
  return useQuery({
    queryKey: queryKeys.races(year),
    queryFn: () => strategyApi.getRaces(year),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ==================== Segment Analysis Hooks ====================
export function useSegmentAnalysis(request: SegmentAnalysisRequest | null) {
  return useQuery({
    queryKey: queryKeys.segmentAnalysis(request!),
    queryFn: () => circuitApi.getSegmentAnalysis(request!),
    enabled: !!request && request.start_dist >= 0 && request.end_dist > request.start_dist,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrackInfo(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trackInfo(sessionId || ''),
    queryFn: () => circuitApi.getTrackInfo(sessionId!),
    enabled: !!sessionId,
  });
}
