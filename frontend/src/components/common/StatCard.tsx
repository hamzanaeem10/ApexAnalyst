import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'default';
}

const gradientClasses = {
  red: 'from-red-500 to-red-600',
  green: 'from-emerald-500 to-emerald-600',
  blue: 'from-blue-500 to-cyan-600',
  yellow: 'from-amber-500 to-yellow-600',
  purple: 'from-purple-500 to-pink-600',
  default: 'from-gray-500 to-gray-600',
};

const bgGradientClasses = {
  red: 'from-red-500/10 via-transparent to-transparent',
  green: 'from-emerald-500/10 via-transparent to-transparent',
  blue: 'from-blue-500/10 via-transparent to-transparent',
  yellow: 'from-amber-500/10 via-transparent to-transparent',
  purple: 'from-purple-500/10 via-transparent to-transparent',
  default: 'from-gray-500/10 via-transparent to-transparent',
};

const glowClasses = {
  red: 'shadow-red-500/20',
  green: 'shadow-emerald-500/20',
  blue: 'shadow-blue-500/20',
  yellow: 'shadow-amber-500/20',
  purple: 'shadow-purple-500/20',
  default: 'shadow-gray-500/20',
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'default',
}: StatCardProps) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendClass = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';
  
  return (
    <div className="stat-card apex-card group relative overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradientClasses[color]} opacity-50`} />
      
      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {title}
            </p>
            <p className="text-3xl font-black text-white tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
            )}
            {trend && trendValue && (
              <p className={`text-sm font-bold ${trendClass} flex items-center gap-1`}>
                <span>{trendIcon}</span>
                <span>{trendValue}</span>
              </p>
            )}
          </div>
          
          {Icon && (
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientClasses[color]} shadow-lg ${glowClasses[color]} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClasses[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  );
}
