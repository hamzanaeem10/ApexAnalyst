import { Activity, Timer, Cloud, Target, Layers, ArrowRight, TrendingUp, Flag, Users, Zap, Gauge, Radio, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import SessionSelector from '../components/session/SessionSelector';
import { useCurrentSession } from '../store/sessionStore';
import Scene from '../components/three/Scene';

const modules = [
  {
    path: '/telemetry',
    title: 'Telemetry',
    subtitle: 'Live Data Analysis',
    description: 'Compare speed, throttle, brake, and gear data between drivers lap-by-lap',
    icon: Activity,
    gradient: 'from-red-500 to-orange-600',
    bgGradient: 'from-red-500/10 to-orange-600/5',
  },
  {
    path: '/lap-analysis',
    title: 'Lap Times',
    subtitle: 'Performance Tracking',
    description: 'Track lap time evolution, sector times, and tyre degradation patterns',
    icon: Timer,
    gradient: 'from-blue-500 to-cyan-600',
    bgGradient: 'from-blue-500/10 to-cyan-600/5',
  },
  {
    path: '/weather',
    title: 'Weather',
    subtitle: 'Conditions Impact',
    description: 'Analyze how weather conditions correlate with driver performance',
    icon: Cloud,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/10 to-teal-600/5',
  },
  {
    path: '/strategy',
    title: 'Strategy',
    subtitle: 'Pit & Tyre Analysis',
    description: 'Historical pit stop strategies, compound usage, and timing analysis',
    icon: Target,
    gradient: 'from-amber-500 to-yellow-600',
    bgGradient: 'from-amber-500/10 to-yellow-600/5',
  },
  {
    path: '/segments',
    title: 'Segments',
    subtitle: 'Mini-Sector Analysis',
    description: 'Mini-sector analysis comparing corner speeds and straight-line pace',
    icon: Layers,
    gradient: 'from-purple-500 to-pink-600',
    bgGradient: 'from-purple-500/10 to-pink-600/5',
  },
  {
    path: '/race-analysis',
    title: 'Race Analysis',
    subtitle: 'Full Race Review',
    description: 'Comprehensive race analysis with position changes and key moments',
    icon: Gauge,
    gradient: 'from-indigo-500 to-violet-600',
    bgGradient: 'from-indigo-500/10 to-violet-600/5',
  },
];

export default function Dashboard() {
  const currentSession = useCurrentSession();

  return (
    <div className="space-y-12">
      {/* Hero Section - Inspired by Ferrari SF-24 Launch */}
      <div className="relative min-h-[600px] rounded-[2rem] overflow-hidden bg-[#0D0D12] border border-white/5 flex flex-col group">
        {/* 3D Scene Background */}
        <div className="absolute inset-0 z-0 opacity-80 transition-opacity duration-700 group-hover:opacity-100">
          <Scene />
        </div>

        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(225,6,0,0.1),transparent_70%)] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] opacity-10 pointer-events-none z-0" />
        
        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between p-8 md:p-10">
          <div className="flex items-center gap-4 text-sm font-medium tracking-widest text-gray-500 uppercase">
            <span className="text-f1-red">Season 2025</span>
            <span>•</span>
            <span>Apex Analyst v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-f1-red animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-white uppercase">System Online</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
          {currentSession ? (
            <>
              <div className="mb-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-f1-red/10 border border-f1-red/20 backdrop-blur-sm">
                <Radio className="w-3 h-3 text-f1-red animate-pulse" />
                <span className="text-xs font-bold text-f1-red uppercase tracking-wider">Live Session Data</span>
              </div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter mb-2">
                {currentSession.grand_prix.split(' ')[0].toUpperCase()}
              </h1>
              <p className="text-xl md:text-2xl font-medium text-gray-400 tracking-widest uppercase">
                {currentSession.session_name} • {currentSession.year}
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Next Gen Analytics</span>
              </div>
              <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter mb-2">
                APEX<span className="text-transparent bg-clip-text bg-gradient-to-r from-f1-red to-red-600">-25</span>
              </h1>
              <p className="text-xl md:text-2xl font-medium text-gray-400 tracking-widest uppercase">
                Race Intelligence Platform
              </p>
            </>
          )}
        </div>

        {/* Tech Specs Row - The "Ferrari" inspired bottom bar */}
        <div className="relative z-10 mt-auto border-t border-white/10 bg-black/20 backdrop-blur-md">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {currentSession ? (
              <>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-f1-red transition-colors">
                    <Map className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Circuit</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">{currentSession.track_data.track_name}</p>
                </div>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-blue-500 transition-colors">
                    <Users className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Grid</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">{currentSession.drivers.length} Drivers</p>
                </div>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-yellow-500 transition-colors">
                    <Flag className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Teams</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">{currentSession.teams.length} Teams</p>
                </div>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-green-500 transition-colors">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Length</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">{(currentSession.track_data.track_length / 1000).toFixed(3)} KM</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-f1-red transition-colors">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Telemetry</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">Real-time Data</p>
                </div>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-blue-500 transition-colors">
                    <Target className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Strategy</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">Race Prediction</p>
                </div>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-yellow-500 transition-colors">
                    <Cloud className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Weather</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">Impact Analysis</p>
                </div>
                <div className="p-6 md:p-8 group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 mb-2 text-gray-500 group-hover:text-green-500 transition-colors">
                    <Layers className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Segments</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">Micro-Sectors</p>
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

      {/* Module Cards */}
      <div className="page-section">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-1 bg-f1-red rounded-full" />
          <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Analysis Modules</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link
              key={module.path}
              to={module.path}
              className="group relative apex-card p-8 hover:border-white/20 transition-all duration-500"
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <module.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <div className="space-y-2 mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{module.subtitle}</p>
                  <h3 className="text-xl font-bold text-white group-hover:text-f1-red transition-colors">
                    {module.title}
                  </h3>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  {module.description}
                </p>

                {/* Action */}
                <div className="flex items-center gap-2 text-f1-red text-sm font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span>Explore</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden rounded-tr-2xl">
                <div className={`absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rotate-45`} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
