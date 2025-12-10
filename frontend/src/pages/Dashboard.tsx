import { Activity, Timer, Cloud, Target, Layers, ArrowRight, TrendingUp, Flag, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SessionSelector from '../components/session/SessionSelector';
import StatCard from '../components/common/StatCard';
import { useCurrentSession } from '../store/sessionStore';

const modules = [
  {
    path: '/telemetry',
    title: 'Telemetry Comparison',
    description: 'Compare speed, throttle, brake, and gear data between drivers lap-by-lap',
    icon: Activity,
    color: 'red' as const,
  },
  {
    path: '/lap-analysis',
    title: 'Lap Time Analysis',
    description: 'Track lap time evolution, sector times, and tyre degradation patterns',
    icon: Timer,
    color: 'blue' as const,
  },
  {
    path: '/weather',
    title: 'Weather Impact',
    description: 'Analyze how weather conditions correlate with driver performance',
    icon: Cloud,
    color: 'green' as const,
  },
  {
    path: '/strategy',
    title: 'Strategy Analysis',
    description: 'Historical pit stop strategies, compound usage, and timing analysis',
    icon: Target,
    color: 'yellow' as const,
  },
  {
    path: '/segments',
    title: 'Segment Performance',
    description: 'Mini-sector analysis comparing corner speeds and straight-line pace',
    icon: Layers,
    color: 'purple' as const,
  },
];

export default function Dashboard() {
  const currentSession = useCurrentSession();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          <span className="text-f1-red">Apex</span> Analyst
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Professional F1 race strategy and performance analytics platform. 
          Load a session to unlock powerful data-driven insights.
        </p>
      </div>

      {/* Session Selector */}
      <SessionSelector />

      {/* Quick Stats */}
      {currentSession && (
        <div className="dashboard-grid">
          <StatCard
            title="Session"
            value={currentSession.session_name}
            subtitle={currentSession.grand_prix}
            icon={Flag}
            color="red"
          />
          <StatCard
            title="Drivers"
            value={currentSession.drivers.length}
            subtitle="In session"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Circuit"
            value={currentSession.track_data.track_name}
            subtitle={String(currentSession.year)}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Track Length"
            value={`${(currentSession.track_data.track_length / 1000).toFixed(2)} km`}
            subtitle={`${currentSession.teams.length} teams`}
            icon={Activity}
            color="green"
          />
        </div>
      )}

      {/* Module Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-6">Analysis Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link
              key={module.path}
              to={module.path}
              className="apex-card p-6 hover:border-f1-red/50 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-lg bg-${module.color}-500/20 flex items-center justify-center mb-4`}>
                <module.icon className={`w-6 h-6 text-${module.color}-500`} />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-f1-red transition-colors">
                {module.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {module.description}
              </p>
              <div className="flex items-center gap-2 text-f1-red text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Section */}
      {!currentSession && (
        <div className="apex-card p-8 text-center">
          <Flag className="w-16 h-16 mx-auto text-f1-gray mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Session Loaded</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Select a year, Grand Prix, and session type above to load F1 data. 
            Once loaded, you'll have access to all analysis modules.
          </p>
        </div>
      )}
    </div>
  );
}
