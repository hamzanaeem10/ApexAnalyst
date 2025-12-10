import type { SafetyCarResponse } from '../../services/api';
import { AlertTriangle, Shield, Zap } from 'lucide-react';

interface SafetyCarCardProps {
  data: SafetyCarResponse;
}

export default function SafetyCarCard({ data }: SafetyCarCardProps) {
  const probabilityColor = data.historical_sc_probability > 0.6 ? 'text-red-400' : 
                           data.historical_sc_probability > 0.4 ? 'text-amber-400' : 'text-green-400';
  
  const probabilityBg = data.historical_sc_probability > 0.6 ? 'bg-red-900/20 border-red-500/30' : 
                        data.historical_sc_probability > 0.4 ? 'bg-amber-900/20 border-amber-500/30' : 
                        'bg-green-900/20 border-green-500/30';

  return (
    <div className="apex-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-400" />
        <h3 className="text-lg font-semibold">Safety Car Probability</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main probability */}
        <div className={`p-4 rounded-lg border ${probabilityBg}`}>
          <p className="text-gray-400 text-sm">Historical SC Probability</p>
          <p className={`text-4xl font-bold ${probabilityColor}`}>
            {(data.historical_sc_probability * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{data.circuit}</p>
        </div>
        
        {/* Session events */}
        <div className="bg-dark-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Session Events</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Safety Car</span>
              </div>
              <span className="font-mono">{data.sc_count} deployments</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span>Virtual SC</span>
              </div>
              <span className="font-mono">{data.vsc_count} deployments</span>
            </div>
          </div>
          
          {data.sc_laps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-700">
              <p className="text-xs text-gray-400">SC Laps: {data.sc_laps.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Strategy recommendation */}
      <div className="mt-4 p-4 bg-dark-800 rounded-lg">
        <p className="text-gray-400 text-sm mb-1">💡 Strategy Recommendation</p>
        <p className="text-sm">{data.strategy_recommendation}</p>
      </div>
    </div>
  );
}
