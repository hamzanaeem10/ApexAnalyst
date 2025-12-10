import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { plotlyDarkLayout } from '../../utils/helpers';
import type { TyreDegradationResponse, PitWindowResponse } from '../../services/api';
import { Calculator, TrendingUp, Clock } from 'lucide-react';

interface WhatIfSimulatorProps {
  tyreDegradation: TyreDegradationResponse;
  pitWindow?: PitWindowResponse;
  totalLaps: number;
}

interface StrategyLeg {
  compound: string;
  startLap: number;
  endLap: number;
}

const COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD'];
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#FF1801',
  MEDIUM: '#FFD800',
  HARD: '#FFFFFF',
};

export default function WhatIfSimulator({ tyreDegradation, pitWindow: _pitWindow, totalLaps }: WhatIfSimulatorProps) {
  const [strategy, setStrategy] = useState<StrategyLeg[]>([
    { compound: 'MEDIUM', startLap: 1, endLap: 25 },
    { compound: 'HARD', startLap: 26, endLap: totalLaps },
  ]);

  const [compareStrategy, setCompareStrategy] = useState<StrategyLeg[]>([
    { compound: 'SOFT', startLap: 1, endLap: 15 },
    { compound: 'MEDIUM', startLap: 16, endLap: 40 },
    { compound: 'HARD', startLap: 41, endLap: totalLaps },
  ]);

  // Calculate lap times for a strategy
  const calculateLapTimes = (legs: StrategyLeg[]) => {
    const lapTimes: number[] = [];
    const baseLapTime = 90; // Base lap time in seconds
    const pitStopTime = 22; // Pit stop delta in seconds
    
    legs.forEach((leg, legIdx) => {
      const compoundData = tyreDegradation.degradation_curves[leg.compound.toUpperCase()];
      const degradationRate = compoundData?.degradation_rate || 0.05;
      const compoundDelta = leg.compound === 'SOFT' ? -0.5 : 
                            leg.compound === 'HARD' ? 0.5 : 0;
      
      for (let lap = leg.startLap; lap <= leg.endLap; lap++) {
        const tyreAge = lap - leg.startLap;
        const degradation = tyreAge * degradationRate;
        let lapTime = baseLapTime + compoundDelta + degradation;
        
        // Add pit stop time if not the last stint
        if (lap === leg.endLap && legIdx < legs.length - 1) {
          lapTime += pitStopTime;
        }
        
        lapTimes.push(lapTime);
      }
    });
    
    return lapTimes;
  };

  const strategyTimes = useMemo(() => calculateLapTimes(strategy), [strategy, tyreDegradation]);
  const compareTimes = useMemo(() => calculateLapTimes(compareStrategy), [compareStrategy, tyreDegradation]);
  
  const totalTime = strategyTimes.reduce((a, b) => a + b, 0);
  const compareTotal = compareTimes.reduce((a, b) => a + b, 0);
  const delta = totalTime - compareTotal;

  // Create plot data
  const traces: Plotly.Data[] = [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Strategy A',
      x: Array.from({ length: strategyTimes.length }, (_, i) => i + 1),
      y: strategyTimes,
      line: { color: '#3B82F6', width: 2 },
      hovertemplate: 'Lap %{x}<br>Time: %{y:.2f}s<extra>Strategy A</extra>',
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Strategy B',
      x: Array.from({ length: compareTimes.length }, (_, i) => i + 1),
      y: compareTimes,
      line: { color: '#22C55E', width: 2 },
      hovertemplate: 'Lap %{x}<br>Time: %{y:.2f}s<extra>Strategy B</extra>',
    },
  ];

  // Add pit stop markers
  strategy.forEach((leg, idx) => {
    if (idx < strategy.length - 1) {
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: 'Pit Stop A',
        x: [leg.endLap],
        y: [strategyTimes[leg.endLap - 1]],
        marker: { symbol: 'triangle-down', size: 12, color: '#3B82F6' },
        showlegend: idx === 0,
        hovertemplate: `Pit Stop<br>Lap %{x}<extra></extra>`,
      } as Plotly.Data);
    }
  });

  compareStrategy.forEach((leg, idx) => {
    if (idx < compareStrategy.length - 1) {
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: 'Pit Stop B',
        x: [leg.endLap],
        y: [compareTimes[leg.endLap - 1]],
        marker: { symbol: 'triangle-down', size: 12, color: '#22C55E' },
        showlegend: idx === 0,
        hovertemplate: `Pit Stop<br>Lap %{x}<extra></extra>`,
      } as Plotly.Data);
    }
  });

  const layout = {
    ...plotlyDarkLayout,
    title: { text: 'What-If Strategy Comparison', font: { color: '#F5F5F5', size: 18 } },
    xaxis: {
      ...plotlyDarkLayout.xaxis,
      title: 'Lap',
    },
    yaxis: {
      ...plotlyDarkLayout.yaxis,
      title: 'Lap Time (s)',
    },
    legend: {
      ...plotlyDarkLayout.legend,
      orientation: 'h' as const,
      y: -0.15,
    },
  };

  const addLeg = (isCompare: boolean) => {
    const setter = isCompare ? setCompareStrategy : setStrategy;
    const current = isCompare ? compareStrategy : strategy;
    const lastLeg = current[current.length - 1];
    
    if (current.length < 4) {
      const newEndLap = Math.min(lastLeg.endLap + 15, totalLaps);
      setter([
        ...current.slice(0, -1),
        { ...lastLeg, endLap: lastLeg.endLap },
        { compound: 'HARD', startLap: lastLeg.endLap + 1, endLap: newEndLap }
      ]);
    }
  };

  const removeLeg = (isCompare: boolean) => {
    const setter = isCompare ? setCompareStrategy : setStrategy;
    const current = isCompare ? compareStrategy : strategy;
    
    if (current.length > 1) {
      const newStrategy = current.slice(0, -1);
      newStrategy[newStrategy.length - 1].endLap = totalLaps;
      setter(newStrategy);
    }
  };

  const updateLeg = (isCompare: boolean, index: number, field: keyof StrategyLeg, value: string | number) => {
    const setter = isCompare ? setCompareStrategy : setStrategy;
    const current = isCompare ? compareStrategy : strategy;
    
    const updated = [...current];
    updated[index] = { ...updated[index], [field]: value };
    
    // Adjust subsequent legs
    if (field === 'endLap' && index < updated.length - 1) {
      updated[index + 1].startLap = Number(value) + 1;
    }
    
    setter(updated);
  };

  const StrategyEditor = ({ legs, isCompare }: { legs: StrategyLeg[], isCompare: boolean }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold ${isCompare ? 'text-green-400' : 'text-blue-400'}`}>
          Strategy {isCompare ? 'B' : 'A'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => addLeg(isCompare)}
            className="px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 rounded"
            disabled={legs.length >= 4}
          >
            + Add Stint
          </button>
          <button
            onClick={() => removeLeg(isCompare)}
            className="px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 rounded"
            disabled={legs.length <= 1}
          >
            - Remove
          </button>
        </div>
      </div>
      
      {legs.map((leg, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 bg-dark-800 rounded">
          <span className="text-xs text-gray-400 w-12">Stint {idx + 1}</span>
          <select
            value={leg.compound}
            onChange={(e) => updateLeg(isCompare, idx, 'compound', e.target.value)}
            className="bg-dark-700 text-white px-2 py-1 rounded text-sm"
            style={{ borderLeft: `4px solid ${COMPOUND_COLORS[leg.compound]}` }}
          >
            {COMPOUNDS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">Laps</span>
          <input
            type="number"
            value={leg.startLap}
            onChange={(e) => updateLeg(isCompare, idx, 'startLap', parseInt(e.target.value))}
            className="w-14 bg-dark-700 text-white px-2 py-1 rounded text-sm text-center"
            disabled={idx > 0}
          />
          <span className="text-gray-400">→</span>
          <input
            type="number"
            value={leg.endLap}
            onChange={(e) => updateLeg(isCompare, idx, 'endLap', parseInt(e.target.value))}
            className="w-14 bg-dark-700 text-white px-2 py-1 rounded text-sm text-center"
            min={leg.startLap}
            max={idx === legs.length - 1 ? totalLaps : totalLaps - 5}
          />
        </div>
      ))}
    </div>
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="apex-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-semibold">What-If Strategy Simulator</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <StrategyEditor legs={strategy} isCompare={false} />
          <StrategyEditor legs={compareStrategy} isCompare={true} />
        </div>
        
        {/* Results summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Strategy A Total</span>
            </div>
            <p className="text-xl font-bold text-blue-400">{formatTime(totalTime)}</p>
          </div>
          <div className="bg-dark-800 p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Delta</span>
            </div>
            <p className={`text-xl font-bold ${delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(2)}s
            </p>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Strategy B Total</span>
            </div>
            <p className="text-xl font-bold text-green-400">{formatTime(compareTotal)}</p>
          </div>
        </div>
        
        <Plot
          data={traces}
          layout={layout as any}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '350px' }}
        />
      </div>
    </div>
  );
}
