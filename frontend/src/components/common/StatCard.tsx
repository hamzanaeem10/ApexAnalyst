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

const colorClasses = {
  red: 'from-f1-red/20 to-transparent border-f1-red/30',
  green: 'from-green-500/20 to-transparent border-green-500/30',
  blue: 'from-blue-500/20 to-transparent border-blue-500/30',
  yellow: 'from-yellow-500/20 to-transparent border-yellow-500/30',
  purple: 'from-purple-500/20 to-transparent border-purple-500/30',
  default: 'from-f1-gray/20 to-transparent border-f1-gray/30',
};

const iconColorClasses = {
  red: 'text-f1-red',
  green: 'text-green-500',
  blue: 'text-blue-500',
  yellow: 'text-yellow-500',
  purple: 'text-purple-500',
  default: 'text-gray-400',
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
  const trendClass = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';
  
  return (
    <div className={`stat-card apex-card p-6 bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-3xl font-bold mt-2 text-white font-mono">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <p className={`text-sm mt-2 ${trendClass}`}>
              {trendIcon} {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg bg-f1-dark/50 ${iconColorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
