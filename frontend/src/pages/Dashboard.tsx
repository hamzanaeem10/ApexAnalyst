import { Activity, Timer, Cloud, Target, Layers, ArrowRight, TrendingUp, Flag, Users, Zap, Gauge, Radio, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import SessionSelector from '../components/session/SessionSelector';
import { useCurrentSession } from '../store/sessionStore';
import Scene from '../components/three/Scene';

const modules = [
  {
    path: '/telemetry',
    title: 'TELEMETRY',
    subtitle: 'LIVE DATA',
    description: 'Speed, throttle, brake traces — driver comparison lap-by-lap',
    icon: Activity,
    accentColor: 'var(--apex-red)',
  },
  {
    path: '/lap-analysis',
    title: 'LAP TIMES',
    subtitle: 'PERFORMANCE',
    description: 'Lap evolution, sector splits, tyre degradation curves',
    icon: Timer,
    accentColor: 'var(--apex-cyan)',
  },
  {
    path: '/weather',
    title: 'WEATHER',
    subtitle: 'CONDITIONS',
    description: 'Track temp, humidity correlation with pace delta',
    icon: Cloud,
    accentColor: 'var(--apex-green)',
  },
  {
    path: '/strategy',
    title: 'STRATEGY',
    subtitle: 'PIT WALL',
    description: 'Compound stints, pit windows, undercut/overcut analysis',
    icon: Target,
    accentColor: 'var(--apex-yellow)',
  },
  {
    path: '/segments',
    title: 'SEGMENTS',
    subtitle: 'MICRO-SECTORS',
    description: 'Corner-by-corner breakdown, apex speeds, braking zones',
    icon: Layers,
    accentColor: 'var(--apex-orange)',
  },
  {
    path: '/race-analysis',
    title: 'RACE',
    subtitle: 'FULL REVIEW',
    description: 'Position changes, key moments, race pace analysis',
    icon: Gauge,
    accentColor: 'var(--apex-blue)',
  },
];

export default function Dashboard() {
  const currentSession = useCurrentSession();

  return (
    <div className="space-y-12">
      {/* Hero Section - Pit Wall Monitor Aesthetic */}
      <div className="relative min-h-[600px] overflow-hidden bg-apex-carbon border border-apex-chrome/30 flex flex-col group" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)' }}>
        {/* 3D Scene Background */}
        <div className="absolute inset-0 z-0 opacity-70 transition-opacity duration-700 group-hover:opacity-90">
          <Scene />
        </div>

        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[5]">
          <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-apex-cyan/5 to-transparent animate-scan" />
        </div>
        
        {/* Top Bar - Status Strip */}
        <div className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-apex-chrome/20 bg-apex-void/60 backdrop-blur-sm">
          <div className="flex items-center gap-6 font-mono text-xs tracking-widest text-apex-chrome uppercase">
            <span className="text-apex-red font-bold">SYS::2025</span>
            <span className="text-apex-chrome/50">|</span>
            <span>APEX_ANALYST_v2.0</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-apex-green animate-pulse" />
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-apex-green uppercase">ONLINE</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
          {currentSession ? (
            <>
              <div className="mb-6 flex items-center gap-3 px-5 py-2 bg-apex-red/10 border border-apex-red/30">
                <Radio className="w-3 h-3 text-apex-red animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-apex-red uppercase tracking-[0.3em]">SESSION ACTIVE</span>
              </div>
              <h1 className="font-headline text-7xl md:text-9xl lg:text-[12rem] text-white tracking-tight leading-none mb-4 text-glow-subtle">
                {currentSession.grand_prix.split(' ')[0].toUpperCase()}
              </h1>
              <p className="font-mono text-lg md:text-xl text-apex-chrome tracking-[0.3em] uppercase">
                {currentSession.session_name} // {currentSession.year}
              </p>
            </>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3 px-5 py-2 bg-apex-cyan/5 border border-apex-cyan/20">
                <Zap className="w-3 h-3 text-apex-cyan" />
                <span className="font-mono text-[10px] font-bold text-apex-cyan uppercase tracking-[0.3em]">RACE INTELLIGENCE</span>
              </div>
              <h1 className="font-headline text-8xl md:text-[10rem] lg:text-[14rem] text-white tracking-tight leading-none mb-4">
                APEX
              </h1>
              <p className="font-mono text-lg text-apex-chrome tracking-[0.3em] uppercase">
                TELEMETRY // STRATEGY // ANALYSIS
              </p>
            </>
          )}
        </div>

        {/* Tech Specs Row - Data Strip */}
        <div className="relative z-10 mt-auto border-t border-apex-chrome/20 bg-apex-void/80 backdrop-blur-md">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-apex-chrome/20">
            {currentSession ? (
              <>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-red/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Map className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-red transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">CIRCUIT</span>
                  </div>
                  <p className="font-mono text-sm md:text-base font-bold text-white truncate">{currentSession.track_data.track_name}</p>
                </div>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-cyan/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-cyan transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">GRID</span>
                  </div>
                  <p className="font-mono text-sm md:text-base font-bold text-white">{currentSession.drivers.length} <span className="text-apex-chrome/60 text-xs">DRV</span></p>
                </div>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-yellow/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-yellow transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">TEAMS</span>
                  </div>
                  <p className="font-mono text-sm md:text-base font-bold text-white">{currentSession.teams.length} <span className="text-apex-chrome/60 text-xs">ENT</span></p>
                </div>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-green/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-green transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">LENGTH</span>
                  </div>
                  <p className="font-mono text-sm md:text-base font-bold text-white">{(currentSession.track_data.track_length / 1000).toFixed(3)} <span className="text-apex-chrome/60 text-xs">KM</span></p>
                </div>
              </>
            ) : (
              <>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-red/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-red transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">TELEMETRY</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">REAL-TIME</p>
                </div>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-cyan/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-cyan transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">STRATEGY</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">PREDICTIVE</p>
                </div>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-yellow/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-yellow transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">WEATHER</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">ANALYSIS</p>
                </div>
                <div className="p-5 md:p-6 group/stat hover:bg-apex-green/5 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-apex-chrome/60 group-hover/stat:text-apex-green transition-colors" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-apex-chrome/60">SEGMENTS</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">MICRO-SEC</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Session Selector */}
      <div className="page-section">
        <SessionSelector />
      </div>

      {/* Module Cards - Industrial Grid */}
      <div className="page-section">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-6 w-1 bg-apex-red" />
          <h2 className="font-display text-xl font-bold text-white uppercase tracking-[0.2em]">Analysis Modules</h2>
          <div className="flex-1 h-px bg-apex-chrome/20" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => (
            <Link
              key={module.path}
              to={module.path}
              className="group relative apex-card p-0 overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Top accent bar */}
              <div className="h-0.5 w-full" style={{ backgroundColor: module.accentColor }} />
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-apex-chrome/30 group-hover:border-opacity-60 transition-colors" style={{ color: module.accentColor }}>
                    <module.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-apex-chrome/40 uppercase">{module.subtitle}</span>
                </div>

                {/* Title */}
                <h3 className="font-display text-xl font-bold text-white mb-3 group-hover:text-opacity-100 transition-colors" style={{ ['--hover-color' as string]: module.accentColor }}>
                  {module.title}
                </h3>

                {/* Description */}
                <p className="font-mono text-xs text-apex-chrome/70 leading-relaxed mb-6">
                  {module.description}
                </p>

                {/* Action */}
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ color: module.accentColor }}>
                  <span>ENTER</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${module.accentColor}10, transparent 70%)` }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
