import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSchedule, useLoadSession } from '../../hooks/useApi';
import { useCurrentSession, useSessionLoading, useSessionError } from '../../store/sessionStore';
import { getAvailableSeasons, sessionTypeNames } from '../../utils/helpers';
import { sessionApi, type SessionStatus } from '../../services/api';
import { Loader2, Calendar, MapPin, AlertCircle, ChevronDown, Zap, Trophy, Timer, Radio, CheckCircle2, Gauge, Activity, Clock, Coffee } from 'lucide-react';
import type { SessionLoadRequest } from '../../types';

interface SessionSelectorProps {
  onSessionLoaded?: () => void;
}

type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Q' | 'R' | 'S';

// Loading steps for visual feedback
const loadingSteps = [
  { id: 'connect', label: 'Connecting to F1 servers', icon: Radio, duration: '~2s' },
  { id: 'fetch', label: 'Downloading session data', icon: Activity, duration: '~5s' },
  { id: 'telemetry', label: 'Processing telemetry', icon: Gauge, duration: '~10s' },
  { id: 'complete', label: 'Ready to analyze', icon: CheckCircle2, duration: '' },
];

// Fun F1 facts to show during loading
const f1Facts = [
  "An F1 car generates enough downforce to drive upside down in a tunnel at 120 mph",
  "F1 drivers can experience up to 6G forces during braking",
  "A full F1 car weighs just 798kg including the driver",
  "F1 brakes can reach temperatures of 1000°C during heavy braking",
  "DRS can add up to 15 km/h to a car's top speed",
  "F1 steering wheels have over 20 buttons and switches",
  "Pit stops can be completed in under 2 seconds",
  "F1 engines rev up to 15,000 RPM",
  "Drivers lose up to 3kg of body weight during a race",
  "F1 tyres are filled with nitrogen, not regular air",
  "The average F1 car has over 80,000 components",
  "F1 drivers' reaction times are around 0.2 seconds",
];

export default function SessionSelector({ onSessionLoaded }: SessionSelectorProps) {
  const seasons = useMemo(() => getAvailableSeasons(), []);
  
  const [selectedYear, setSelectedYear] = useState<number>(seasons[0]);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState<string>('');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('R');
  const [loadingStatus, setLoadingStatus] = useState<SessionStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentFact, setCurrentFact] = useState(() => f1Facts[Math.floor(Math.random() * f1Facts.length)]);
  
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(selectedYear);
  const loadSessionMutation = useLoadSession();
  
  const currentSession = useCurrentSession();
  const isLoading = useSessionLoading();
  const error = useSessionError();

  const isBackgroundLoading = !!(
    loadingStatus &&
    !loadingStatus.full_telemetry_loaded &&
    loadingStatus.state !== 'ready' &&
    loadingStatus.state !== 'error'
  );
  const overlayActive = isLoading || isBackgroundLoading;

  // Timer for elapsed time during loading
  useEffect(() => {
    if (overlayActive) {
      setElapsedTime(0);
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [overlayActive]);

  // Rotate fun facts every 5 seconds during loading
  useEffect(() => {
    if (overlayActive) {
      const interval = setInterval(() => {
        setCurrentFact(f1Facts[Math.floor(Math.random() * f1Facts.length)]);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [overlayActive]);

  // Progress through loading steps based on elapsed time
  useEffect(() => {
    if (overlayActive) {
      // More realistic step progression based on time
      if (elapsedTime < 2) setCurrentStep(0);
      else if (elapsedTime < 7) setCurrentStep(1);
      else if (elapsedTime < 15) setCurrentStep(2);
      else setCurrentStep(2); // Stay on telemetry until done
    } else if (currentSession && currentStep !== 0) {
      setCurrentStep(3);
      const timeout = setTimeout(() => setCurrentStep(0), 2000);
      return () => clearTimeout(timeout);
    }
  }, [overlayActive, elapsedTime, currentSession, currentStep]);
  
  // Poll for session status while telemetry is loading in background
  useEffect(() => {
    if (!currentSession?.session_id) return;
    
    const checkStatus = async () => {
      try {
        const status = await sessionApi.getSessionStatus(currentSession.session_id);
        setLoadingStatus(status);
        
        if (!status.full_telemetry_loaded && status.state !== 'error') {
          setTimeout(checkStatus, 2000);
        }
      } catch (e) {
        console.error('Failed to get session status:', e);
      }
    };
    
    checkStatus();
  }, [currentSession?.session_id]);

  // Format elapsed time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, []);
  
  const handleLoadSession = () => {
    if (!selectedGrandPrix) return;
    
    setLoadingStatus(null);
    setCurrentFact(f1Facts[Math.floor(Math.random() * f1Facts.length)]);
    
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
    const pastEvents = schedule.events.filter(e => new Date(e.event_date) < today);
    
    if (pastEvents.length > 0) {
      const latestEvent = pastEvents[pastEvents.length - 1];
      setSelectedGrandPrix(latestEvent.event_name);
      setSelectedSessionType('R');
      
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
    
    const baseTypes = ['FP1', 'FP2', 'FP3', 'Q', 'R'];
    if (event.event_format === 'sprint_qualifying') {
      return ['FP1', 'SQ', 'S', 'Q', 'R'];
    }
    return baseTypes;
  }, [schedule, selectedGrandPrix]);

  // Loading overlay component with enhanced UX
  const LoadingOverlay = () => (
    <div className="absolute inset-0 z-20 bg-apex-void/98 backdrop-blur-md flex flex-col items-center justify-center p-6 md:p-8">
      <div className="w-full max-w-lg">
        {/* Header with timer */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-apex-red/20 border border-apex-red/30 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-apex-red" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Loading Session</h3>
              <p className="text-xs text-white/40">{selectedGrandPrix} • {sessionTypeNames[selectedSessionType]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10">
            <Clock className="w-4 h-4 text-apex-cyan" />
            <span className="text-sm font-mono text-apex-cyan">{formatTime(elapsedTime)}</span>
          </div>
        </div>

        {/* Main loading animation */}
        <div className="relative mb-8">
          {/* Animated race track line */}
          <div className="h-1 bg-white/5 overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-to-r from-apex-red via-apex-orange to-apex-red animate-pulse"
              style={{ 
                width: `${Math.min(95, (elapsedTime / 20) * 100)}%`,
                transition: 'width 1s ease-out'
              }}
            />
          </div>

          {/* Loading steps */}
          <div className="space-y-2">
            {loadingSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-4 transition-all duration-300 ${
                    isActive ? 'bg-apex-red/10 border-l-2 border-apex-red' :
                    isComplete ? 'bg-apex-green/5 border-l-2 border-apex-green' :
                    'bg-white/[0.02] border-l-2 border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center transition-colors ${
                    isActive ? 'text-apex-red' :
                    isComplete ? 'text-apex-green' :
                    'text-white/20'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium transition-colors ${
                      isActive ? 'text-white' :
                      isComplete ? 'text-apex-green' :
                      'text-white/30'
                    }`}>
                      {step.label}
                    </span>
                    {step.duration && (
                      <span className={`ml-2 text-xs ${isActive ? 'text-white/50' : 'text-white/20'}`}>
                        {step.duration}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-apex-red animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-apex-red animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-apex-red animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  {isComplete && (
                    <span className="text-xs text-apex-green">Done</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Fun fact section */}
        <div className="p-4 bg-apex-cyan/5 border border-apex-cyan/20">
          <div className="flex items-start gap-3">
            <Coffee className="w-5 h-5 text-apex-cyan shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-apex-cyan uppercase tracking-wider mb-1">Did you know?</p>
              <p className="text-sm text-white/70 leading-relaxed">{currentFact}</p>
            </div>
          </div>
        </div>

        {/* Estimated time */}
        <div className="mt-4 text-center">
          <p className="text-xs text-white/30">
            {elapsedTime < 10 
              ? "This usually takes 15-30 seconds..." 
              : elapsedTime < 20 
              ? "Almost there, processing telemetry data..."
              : "Large session, please wait..."}
          </p>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="relative bg-apex-carbon border border-apex-chrome/20 overflow-hidden">
      {/* Loading overlay */}
      {overlayActive && <LoadingOverlay />}

      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-apex-red via-apex-red to-transparent" />

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-apex-red/20 border border-apex-red/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-apex-red" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white tracking-wide">SESSION CONTROL</h2>
              <p className="text-xs text-white/40">Select race weekend data</p>
            </div>
          </div>
          {currentSession && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-apex-green/10 border border-apex-green/30">
              <div className="w-1.5 h-1.5 bg-apex-green animate-pulse" />
              <span className="text-[10px] font-bold text-apex-green uppercase tracking-wider">Loaded</span>
            </div>
          )}
        </div>

        {/* Quick Load Button */}
        <div className="mb-6">
          <button
            onClick={handleQuickLoadLatest}
            disabled={!schedule || scheduleLoading || overlayActive}
            className="w-full group relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-apex-red/30 p-4 transition-all duration-300 disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-apex-red/10 border border-apex-red/20 text-apex-red group-hover:bg-apex-red group-hover:text-white transition-all">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white group-hover:text-apex-red transition-colors">Latest Race</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Quick Load</div>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-white/30 -rotate-90 group-hover:translate-x-1 group-hover:text-apex-red transition-all" />
            </div>
          </button>
        </div>

        {/* Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Year Selection */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-white/40 ml-1">Season</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setSelectedGrandPrix('');
                }}
                className="w-full bg-apex-void border border-apex-chrome/30 text-white text-sm p-3 pl-10 appearance-none focus:outline-none focus:border-apex-red/50 transition-colors"
              >
                {seasons.map((year) => (
                  <option key={year} value={year} className="bg-apex-void">
                    {year} Season
                  </option>
                ))}
              </select>
              <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Grand Prix Selection */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-white/40 ml-1">Grand Prix</label>
            <div className="relative">
              <select
                value={selectedGrandPrix}
                onChange={(e) => setSelectedGrandPrix(e.target.value)}
                disabled={!schedule || scheduleLoading}
                className="w-full bg-apex-void border border-apex-chrome/30 text-white text-sm p-3 pl-10 appearance-none focus:outline-none focus:border-apex-red/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-apex-void">Select Event...</option>
                {schedule?.events.map((event) => (
                  <option key={event.event_name} value={event.event_name} className="bg-apex-void">
                    {event.event_name}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Session Type Selection */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-white/40 ml-1">Session</label>
            <div className="relative">
              <select
                value={selectedSessionType}
                onChange={(e) => setSelectedSessionType(e.target.value as SessionType)}
                disabled={!selectedGrandPrix}
                className="w-full bg-apex-void border border-apex-chrome/30 text-white text-sm p-3 pl-10 appearance-none focus:outline-none focus:border-apex-red/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {availableSessionTypes.map((type) => (
                  <option key={type} value={type} className="bg-apex-void">
                    {sessionTypeNames[type]}
                  </option>
                ))}
              </select>
              <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-6 pt-4">
        <button
          onClick={handleLoadSession}
          disabled={!selectedGrandPrix || overlayActive}
          className="w-full bg-apex-red hover:bg-red-600 text-white font-bold py-4 px-6 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-apex-red/20"
        >
          <Gauge className="w-5 h-5" />
          <span className="tracking-wider">LOAD TELEMETRY</span>
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Failed to load session</p>
              <p className="text-xs text-red-400/70 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Background loading status */}
        {loadingStatus && loadingStatus.progress !== undefined && !overlayActive && (
          <div className="mt-4 p-4 bg-apex-cyan/5 border border-apex-cyan/20">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/60">{loadingStatus.message || 'Loading telemetry...'}</span>
              <span className="text-apex-cyan font-semibold">{Math.round(loadingStatus.progress)}%</span>
            </div>
            <div className="h-1 bg-white/5 overflow-hidden">
              <div 
                className="h-full bg-apex-cyan transition-all duration-300 ease-out"
                style={{ width: `${loadingStatus.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
