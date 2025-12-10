import { XCircle, AlertTriangle, Info } from 'lucide-react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
}

const typeStyles = {
  error: {
    bg: 'bg-red-900/30',
    border: 'border-red-500/50',
    text: 'text-red-400',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-900/30',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    icon: Info,
  },
};

export default function ErrorDisplay({ 
  title = 'Error', 
  message, 
  type = 'error',
  onRetry 
}: ErrorDisplayProps) {
  const styles = typeStyles[type];
  const Icon = styles.icon;
  
  return (
    <div className={`p-6 ${styles.bg} border ${styles.border} rounded-lg`}>
      <div className="flex items-start gap-4">
        <Icon className={`w-6 h-6 ${styles.text} flex-shrink-0`} />
        <div className="flex-1">
          <h3 className={`font-semibold ${styles.text}`}>{title}</h3>
          <p className="text-gray-300 mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-f1-gray hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
