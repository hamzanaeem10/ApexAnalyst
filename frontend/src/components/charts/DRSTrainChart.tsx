import Plot from 'react-plotly.js';
import type { DRSTrainsResponse } from '../../services/api';
import { plotlyDarkLayout } from '../../utils/helpers';

interface DRSTrainChartProps {
  data: DRSTrainsResponse;
}

export default function DRSTrainChart({ data }: DRSTrainChartProps) {
  if (data.train_events.length === 0) {
    return (
      <div className="apex-card p-6 text-center">
        <p className="text-gray-400">No DRS trains detected in this session</p>
      </div>
    );
  }

  const traces: Plotly.Data[] = [];
  const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  
  // Create traces for affected drivers
  data.affected_drivers.forEach((driver, index) => {
    // Find laps where this driver was in a train
    const lapsInTrain = data.train_events
      .filter(event => event.trains.some(train => train.includes(driver.driver)))
      .map(event => event.lap);
    
    if (lapsInTrain.length > 0) {
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: driver.driver,
        x: lapsInTrain,
        y: Array(lapsInTrain.length).fill(index + 1),
        marker: { 
          size: 10, 
          color: driver.color || colors[index % colors.length],
          symbol: 'square',
        },
        hovertemplate: `${driver.driver}<br>Lap %{x}<extra></extra>`,
      } as Plotly.Data);
    }
  });

  const layout = {
    ...plotlyDarkLayout,
    title: { text: 'DRS Train Detection', font: { color: '#F5F5F5', size: 18 } },
    xaxis: {
      ...plotlyDarkLayout.xaxis,
      title: 'Lap Number',
      dtick: 5,
    },
    yaxis: {
      ...plotlyDarkLayout.yaxis,
      title: 'Driver',
      tickvals: data.affected_drivers.map((_, i) => i + 1),
      ticktext: data.affected_drivers.map(d => d.driver),
    },
    legend: {
      ...plotlyDarkLayout.legend,
      orientation: 'h' as const,
      y: -0.15,
    },
  };

  return (
    <div className="apex-card p-4">
      <Plot
        data={traces}
        layout={layout as any}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '350px' }}
      />
      
      {/* Driver summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
        {data.affected_drivers.map((driver, index) => (
          <div key={driver.driver} className="bg-dark-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: driver.color || colors[index % colors.length] }}
              />
              <span className="font-semibold">{driver.driver}</span>
            </div>
            <p className="text-sm text-gray-300">
              {driver.laps_in_train} laps in train
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {driver.percentage.toFixed(1)}% of race
            </p>
          </div>
        ))}
      </div>
      
      {/* Total summary */}
      <div className="mt-4 p-4 bg-dark-800 rounded-lg text-center">
        <p className="text-gray-400 text-sm">Total DRS Train Laps</p>
        <p className="text-2xl font-bold text-amber-400">{data.total_train_laps}</p>
        <p className="text-xs text-gray-500 mt-1">out of {data.total_laps} race laps</p>
      </div>
    </div>
  );
}
