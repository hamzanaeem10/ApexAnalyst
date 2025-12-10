import { useState, useMemo, useEffect } from 'react';
import { useSchedule, useLoadSession } from '../../hooks/useApi';
import { useCurrentSession, useSessionLoading, useSessionError } from '../../store/sessionStore';
import { getAvailableSeasons, sessionTypeNames } from '../../utils/helpers';
import { sessionApi, type SessionStatus } from '../../services/api';
import { Loader2, Calendar, MapPin, AlertCircle, Database, ChevronDown, Zap, Trophy, Timer } from 'lucide-react';
import type { SessionLoadRequest } from '../../types';

interface SessionSelectorProps {
  onSessionLoaded?: () => void;
}

type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Q' | 'R' | 'S';

export default function SessionSelector({ onSessionLoaded }: SessionSelectorProps) {
  const seasons = useMemo(() => getAvailableSeasons(), []);
  
  const [selectedYear, setSelectedYear] = useState<number>(seasons[0]);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState<string>('');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('R');
  const [loadingStatus, setLoadingStatus] = useState<SessionStatus | null>(null);
  
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(selectedYear);
  const loadSessionMutation = useLoadSession();
  
  const currentSession = useCurrentSession();
  const isLoading = useSessionLoading();
  const error = useSessionError();
  
  // Poll for session status while telemetry is loading in background
  useEffect(() => {
    if (!currentSession?.session_id) return;
    
    // Check if telemetry is still loading
    const checkStatus = async () => {
      try {
        const status = await sessionApi.getSessionStatus(currentSession.session_id);
        setLoadingStatus(status);
        
        // Keep polling if not fully loaded
        if (!status.full_telemetry_loaded && status.state !== 'error') {
          setTimeout(checkStatus, 2000);
        }
      } catch (e) {
        console.error('Failed to get session status:', e);
      }
    };
    
    checkStatus();
  }, [currentSession?.session_id]);
  
  const handleLoadSession = () => {
    if (!selectedGrandPrix) return;
    
    setLoadingStatus(null);
    
    const request: SessionLoadRequest = {
      year: selectedYear,
      grand_prix: selectedGrandPrix,
      session_name: selectedSessionType,
    };
    
    loadSessionMutation.mutate(request, {
      onSuccess: () => {
        onSessionLoaded?.();
      },
    });
  };

  const handleQuickLoadLatest = () => {
    if (!schedule?.events) return;

    const today = new Date();
    // Filter for events that have already happened
    const pastEvents = schedule.events.filter(e => new Date(e.event_date) < today);
    
    if (pastEvents.length > 0) {
      const latestEvent = pastEvents[pastEvents.length - 1];
      setSelectedGrandPrix(latestEvent.event_name);
      setSelectedSessionType('R'); // Default to Race
      
      // Trigger load immediately
      setLoadingStatus(null);
      loadSessionMutation.mutate({
        year: selectedYear,
        grand_prix: latestEvent.event_name,
        session_name: 'R'
      }, {
        onSuccess: () => onSessionLoaded?.()
      });
    }
  };
  
  const availableSessionTypes = useMemo(() => {
    if (!schedule || !selectedGrandPrix) return [];
    const event = schedule.events.find(e => e.event_name === selectedGrandPrix);
    if (!event) return [];
    
    // Determine available session types based on event_format
    const baseTypes = ['FP1', 'FP2', 'FP3', 'Q', 'R'];
    if (event.event_format === 'sprint_qualifying') {
      return ['FP1', 'SQ', 'S', 'Q', 'R'];
    }
    return baseTypes;
  }, [schedule, selectedGrandPrix]);
  
  return (
    <div className="apex-card overflow-hidden relative group">
      {/* Decorative background glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-f1-red/5 rounded-full blur-3xl group-hover:bg-f1-red/10 transition-all duration-500" />

      {/* Header */}
      <div className="p-6 pb-4 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-f1-red to-red-700 flex items-center justify-center shadow-lg shadow-f1-red/20 ring-1 ring-white/10">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Session Control</h2>
              <p className="text-xs text-gray-400 font-medium">Select race weekend data</p>
            </div>
          </div>
          {currentSession && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Online</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
           <button
            onClick={handleQuickLoadLatest}
            disabled={!schedule || scheduleLoading || isLoading}
            className="w-full group relative overflow-hidden rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 p-3 transition-all duration-300"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-f1-red/20 text-f1-red group-hover:bg-f1-red group-hover:text-white transition-colors">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white group-hover:text-f1-red transition-colors">Latest Race</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Quick Load</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 -rotate-90 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Year Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Season</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setSelectedGrandPrix('');
                }}
                className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-lg p-3 pl-10 appearance-none focus:outline-none focus:border-f1-red/50 focus:ring-1 focus:ring-f1-red/50 transition-all font-medium"
              >
                {seasons.map((year) => (
                  <option key={year} value={year} className="bg-gray-900">
                    {year} Season
                  </option>
                ))}
              </select>
              <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Grand Prix Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Grand Prix</label>
            <div className="relative">
              <select
                value={selectedGrandPrix}
                onChange={(e) => setSelectedGrandPrix(e.target.value)}
                disabled={!schedule || scheduleLoading}
                className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-lg p-3 pl-10 appearance-none focus:outline-none focus:border-f1-red/50 focus:ring-1 focus:ring-f1-red/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <option value="" className="bg-gray-900">Select Event...</option>
                {schedule?.events.map((event) => (
                  <option key={event.event_name} value={event.event_name} className="bg-gray-900">
                    {event.event_name}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Session Type Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Session</label>
            <div className="relative">
              <select
                value={selectedSessionType}
                onChange={(e) => setSelectedSessionType(e.target.value as SessionType)}
                disabled={!selectedGrandPrix}
                className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-lg p-3 pl-10 appearance-none focus:outline-none focus:border-f1-red/50 focus:ring-1 focus:ring-f1-red/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {availableSessionTypes.map((type) => (
                  <option key={type} value={type} className="bg-gray-900">
                    {sessionTypeNames[type]}
                  </option>
                ))}
              </select>
              <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Action Button */}
      <div className="p-6 pt-4 relative z-10">
        <button
          onClick={handleLoadSession}
          disabled={!selectedGrandPrix || isLoading}
          className="w-full bg-f1-red hover:bg-red-600 text-white font-bold py-3.5 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-f1-red/20 hover:shadow-f1-red/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>INITIALIZING...</span>
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              <span>LOAD TELEMETRY</span>
            </>
          )}
        </button>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {loadingStatus && loadingStatus.progress !== undefined && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{loadingStatus.message || 'Loading...'}</span>
              <span className="text-f1-red font-mono">{Math.round(loadingStatus.progress)}%</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-f1-red transition-all duration-300 ease-out"
                style={{ width: `${loadingStatus.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
