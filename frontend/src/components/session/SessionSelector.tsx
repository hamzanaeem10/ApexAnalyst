import { useState, useMemo, useEffect } from 'react';
import { useSchedule, useLoadSession } from '../../hooks/useApi';
import { useCurrentSession, useSessionLoading, useSessionError } from '../../store/sessionStore';
import { getAvailableSeasons, sessionTypeNames } from '../../utils/helpers';
import { sessionApi, type SessionStatus } from '../../services/api';
import { Loader2, Calendar, Flag, MapPin, AlertCircle, CheckCircle2, Database } from 'lucide-react';
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
    <div className="apex-card p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-f1-red" />
        Session Selection
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Year Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Season
          </label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSelectedGrandPrix('');
            }}
            className="apex-select"
          >
            {seasons.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        {/* Grand Prix Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Grand Prix
          </label>
          {scheduleLoading ? (
            <div className="flex items-center gap-2 h-[42px] text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading events...
            </div>
          ) : (
            <select
              value={selectedGrandPrix}
              onChange={(e) => setSelectedGrandPrix(e.target.value)}
              className="apex-select"
              disabled={!schedule}
            >
              <option value="">Select Grand Prix</option>
              {schedule?.events.map((event) => (
                <option key={event.round_number} value={event.event_name}>
                  {event.event_name}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Session Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Session Type
          </label>
          <select
            value={selectedSessionType}
            onChange={(e) => setSelectedSessionType(e.target.value as SessionType)}
            className="apex-select"
            disabled={!selectedGrandPrix}
          >
            {availableSessionTypes.length > 0 ? (
              availableSessionTypes.map((type) => (
                <option key={type} value={type}>
                  {sessionTypeNames[type] || type}
                </option>
              ))
            ) : (
              <>
                <option value="FP1">Free Practice 1</option>
                <option value="FP2">Free Practice 2</option>
                <option value="FP3">Free Practice 3</option>
                <option value="Q">Qualifying</option>
                <option value="S">Sprint</option>
                <option value="R">Race</option>
              </>
            )}
          </select>
        </div>
        
        {/* Load Button */}
        <div className="flex items-end">
          <button
            onClick={handleLoadSession}
            disabled={!selectedGrandPrix || isLoading}
            className="apex-btn apex-btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4" />
                Load Session
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Failed to load session</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {/* Loading Progress */}
      {isLoading && (
        <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <div className="flex-1">
              <p className="text-blue-300 font-medium">Loading session data...</p>
              <p className="text-blue-400/70 text-sm mt-1">
                This may take a few seconds. Data is cached for faster subsequent loads.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Current Session Info */}
      {currentSession && (
        <div className="mt-6 p-4 bg-f1-gray/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400">LOADED SESSION</h3>
            {loadingStatus && (
              <div className="flex items-center gap-2 text-xs">
                {loadingStatus.full_telemetry_loaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-400">Full data ready</span>
                  </>
                ) : loadingStatus.state === 'loading_telemetry' ? (
                  <>
                    <Database className="w-4 h-4 text-yellow-500 animate-pulse" />
                    <span className="text-yellow-400">Loading telemetry in background...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-400">Basic data loaded</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Event</p>
              <p className="font-semibold text-white">{currentSession.grand_prix}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Circuit</p>
              <p className="font-semibold text-white flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {currentSession.track_data.track_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Session</p>
              <p className="font-semibold text-white">
                {sessionTypeNames[currentSession.session_name] || currentSession.session_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Drivers</p>
              <p className="font-semibold text-white">{currentSession.drivers.length} drivers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
