import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  sessionApi, 
  telemetryApi, 
  lapApi, 
  weatherApi, 
  strategyApi, 
  circuitApi, 
  raceApi,
  advancedStrategyApi,
  advancedWeatherApi,
  advancedSegmentsApi
} from '../services/api';
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
  raceAnalysis: (sessionId: string) => ['raceAnalysis', sessionId] as const,
  raceGaps: (sessionId: string, benchmarkDriver: string) => ['raceGaps', sessionId, benchmarkDriver] as const,
  raceDrivers: (sessionId: string) => ['raceDrivers', sessionId] as const,
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

export function useRaceAnalysis(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.raceAnalysis(sessionId || ''),
    queryFn: () => telemetryApi.getRaceAnalysis(sessionId!),
    enabled: !!sessionId,
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

// ==================== Race Gap Hooks ====================
export function useRaceGaps(sessionId: string | undefined, benchmarkDriver: string | undefined, drivers?: string) {
  return useQuery({
    queryKey: queryKeys.raceGaps(sessionId || '', benchmarkDriver || ''),
    queryFn: () => raceApi.getRaceGaps(sessionId!, benchmarkDriver!, drivers),
    enabled: !!sessionId && !!benchmarkDriver,
    staleTime: 5 * 60 * 1000, // 5 minutes - race data caching for performance
  });
}

export function useRaceDrivers(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.raceDrivers(sessionId || ''),
    queryFn: () => raceApi.getRaceDrivers(sessionId!),
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ==================== Advanced Strategy Hooks ====================
export function useTyreDegradation(sessionId: string | undefined, drivers?: string) {
  return useQuery({
    queryKey: ['tyreDegradation', sessionId, drivers],
    queryFn: () => advancedStrategyApi.getTyreDegradation(sessionId!, drivers),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePitWindow(sessionId: string | undefined, driver: string | undefined, pitTimeLoss?: number) {
  return useQuery({
    queryKey: ['pitWindow', sessionId, driver, pitTimeLoss],
    queryFn: () => advancedStrategyApi.getPitWindow(sessionId!, driver!, pitTimeLoss),
    enabled: !!sessionId && !!driver,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePositionChanges(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['positionChanges', sessionId],
    queryFn: () => advancedStrategyApi.getPositionChanges(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFuelEffect(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['fuelEffect', sessionId],
    queryFn: () => advancedStrategyApi.getFuelEffect(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSafetyCarProbability(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['safetyCarProbability', sessionId],
    queryFn: () => advancedStrategyApi.getSafetyCarProbability(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDRSTrains(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['drsTrains', sessionId],
    queryFn: () => advancedStrategyApi.getDRSTrains(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Advanced Weather Hooks ====================
export function useWeatherTimeline(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['weatherTimeline', sessionId],
    queryFn: () => advancedWeatherApi.getWeatherTimeline(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWindRose(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['windRose', sessionId],
    queryFn: () => advancedWeatherApi.getWindRose(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrackEvolution(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['trackEvolution', sessionId],
    queryFn: () => advancedWeatherApi.getTrackEvolution(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeatherLapImpact(sessionId: string | undefined, driver?: string) {
  return useQuery({
    queryKey: ['weatherLapImpact', sessionId, driver],
    queryFn: () => advancedWeatherApi.getWeatherLapImpact(sessionId!, driver),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Advanced Segments Hooks ====================
export function useMiniSectors(sessionId: string | undefined, numSectors?: number) {
  return useQuery({
    queryKey: ['miniSectors', sessionId, numSectors],
    queryFn: () => advancedSegmentsApi.getMiniSectors(sessionId!, numSectors),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTheoreticalBest(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['theoreticalBest', sessionId],
    queryFn: () => advancedSegmentsApi.getTheoreticalBest(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSectorConsistency(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sectorConsistency', sessionId],
    queryFn: () => advancedSegmentsApi.getSectorConsistency(sessionId!),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCornerAnalysis(sessionId: string | undefined, cornerDistance: number | undefined, window?: number) {
  return useQuery({
    queryKey: ['cornerAnalysis', sessionId, cornerDistance, window],
    queryFn: () => advancedSegmentsApi.getCornerAnalysis(sessionId!, cornerDistance!, window),
    enabled: !!sessionId && cornerDistance !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSpeedTrace(sessionId: string | undefined, drivers: string | undefined, startDist?: number, endDist?: number) {
  return useQuery({
    queryKey: ['speedTrace', sessionId, drivers, startDist, endDist],
    queryFn: () => advancedSegmentsApi.getSpeedTrace(sessionId!, drivers!, startDist, endDist),
    enabled: !!sessionId && !!drivers,
    staleTime: 5 * 60 * 1000,
  });
}
