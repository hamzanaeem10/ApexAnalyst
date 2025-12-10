import { useMemo } from 'react';
import type { WindRoseResponse } from '../../services/api';

interface WindRoseChartProps {
  data: WindRoseResponse;
}

export default function WindRoseChart({ data }: WindRoseChartProps) {
  const maxPercentage = useMemo(() => {
    return Math.max(...data.rose_data.map(d => d.percentage), 20);
  }, [data]);

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  // Calculate SVG coordinates for each direction
  const getCoordinates = (angle: number, percentage: number, maxRadius: number = 120) => {
    const radius = (percentage / maxPercentage) * maxRadius;
    const radians = (angle - 90) * (Math.PI / 180); // Adjust for SVG coordinates
    return {
      x: 150 + radius * Math.cos(radians),
      y: 150 + radius * Math.sin(radians),
    };
  };

  const polygonPoints = useMemo(() => {
    return data.rose_data.map(d => {
      const angle = angles[directions.indexOf(d.direction)];
      const coords = getCoordinates(angle, d.percentage);
      return `${coords.x},${coords.y}`;
    }).join(' ');
  }, [data.rose_data]);

  // Color based on speed
  const getSpeedColor = (speed: number) => {
    if (speed < 5) return '#22C55E';
    if (speed < 10) return '#3B82F6';
    if (speed < 15) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="apex-card p-4">
      <h3 className="text-lg font-semibold mb-4">Wind Rose</h3>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* SVG Wind Rose */}
        <div className="flex-1">
          <svg viewBox="0 0 300 300" className="w-full max-w-[300px] mx-auto">
            {/* Background circles */}
            {[25, 50, 75, 100].map((pct) => (
              <circle
                key={pct}
                cx="150"
                cy="150"
                r={(pct / maxPercentage) * 120}
                fill="none"
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            ))}
            
            {/* Direction lines */}
            {angles.map((angle, idx) => {
              const end = getCoordinates(angle, maxPercentage);
              return (
                <g key={angle}>
                  <line
                    x1="150"
                    y1="150"
                    x2={end.x}
                    y2={end.y}
                    stroke="#374151"
                    strokeWidth="1"
                  />
                  <text
                    x={getCoordinates(angle, maxPercentage + 15).x}
                    y={getCoordinates(angle, maxPercentage + 15).y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#9CA3AF"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {directions[idx]}
                  </text>
                </g>
              );
            })}
            
            {/* Wind polygon */}
            <polygon
              points={polygonPoints}
              fill="rgba(59, 130, 246, 0.3)"
              stroke="#3B82F6"
              strokeWidth="2"
            />
            
            {/* Data points with speed color */}
            {data.rose_data.map((d, idx) => {
              const angle = angles[idx];
              const coords = getCoordinates(angle, d.percentage);
              return (
                <circle
                  key={d.direction}
                  cx={coords.x}
                  cy={coords.y}
                  r="6"
                  fill={getSpeedColor(d.avg_speed)}
                  stroke="#1F2937"
                  strokeWidth="2"
                />
              );
            })}
            
            {/* Center point */}
            <circle cx="150" cy="150" r="4" fill="#F5F5F5" />
          </svg>
        </div>
        
        {/* Stats panel */}
        <div className="flex-1 space-y-4">
          <div className="bg-dark-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Dominant Direction</p>
            <p className="text-2xl font-bold text-blue-400">{data.dominant_direction}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-800 p-3 rounded-lg">
              <p className="text-gray-400 text-xs">Avg Speed</p>
              <p className="text-lg font-mono">{data.avg_wind_speed} km/h</p>
            </div>
            <div className="bg-dark-800 p-3 rounded-lg">
              <p className="text-gray-400 text-xs">Max Speed</p>
              <p className="text-lg font-mono text-orange-400">{data.max_wind_speed} km/h</p>
            </div>
          </div>
          
          {/* Direction breakdown */}
          <div className="bg-dark-800 p-3 rounded-lg">
            <p className="text-gray-400 text-xs mb-2">Direction Distribution</p>
            <div className="space-y-1">
              {data.rose_data.filter(d => d.percentage > 0).slice(0, 4).map(d => (
                <div key={d.direction} className="flex items-center gap-2">
                  <span className="w-6 text-xs font-mono">{d.direction}</span>
                  <div className="flex-1 bg-dark-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Speed Legend */}
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" /> &lt;5
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" /> 5-10
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" /> 10-15
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" /> 15+
            </span>
            <span className="text-gray-400">km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
