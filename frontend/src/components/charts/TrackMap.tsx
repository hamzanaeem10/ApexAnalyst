import { useMemo, useState, useCallback } from 'react';
import type { TrackMapData } from '../../types';

interface TrackMapProps {
  data: TrackMapData;
  driver1: { id: string; name: string; color: string };
  driver2: { id: string; name: string; color: string };
  height?: number;
}

type ColorMode = 'speed' | 'gear';
type DriverSelect = 'driver1' | 'driver2' | 'both';

/**
 * Track Map Component - SVG visualization with speed/gear coloring
 * Shows the track path with telemetry data mapped to color
 */
export default function TrackMap({ 
  data, 
  driver1, 
  driver2,
  height = 400 
}: TrackMapProps) {
  const [colorMode, setColorMode] = useState<ColorMode>('speed');
  const [selectedDriver, setSelectedDriver] = useState<DriverSelect>('both');

  // Calculate bounds and scale
  const { scale, translate } = useMemo(() => {
    const allPoints = [...data.driver_1, ...data.driver_2];
    if (allPoints.length === 0) {
      return { 
        bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 }, 
        scale: 1, 
        translate: { x: 0, y: 0 } 
      };
    }

    const xs = allPoints.map(p => p.x);
    const ys = allPoints.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const width = maxX - minX || 1;
    const heightRange = maxY - minY || 1;
    
    // Calculate scale to fit in viewBox
    const viewBoxWidth = 800;
    const viewBoxHeight = height - 80; // Account for controls
    const padding = 40;
    
    const scaleX = (viewBoxWidth - padding * 2) / width;
    const scaleY = (viewBoxHeight - padding * 2) / heightRange;
    const finalScale = Math.min(scaleX, scaleY);
    
    return {
      bounds: { minX, maxX, minY, maxY },
      scale: finalScale,
      translate: {
        x: padding - minX * finalScale + (viewBoxWidth - width * finalScale) / 2 - padding,
        y: padding - minY * finalScale + (viewBoxHeight - heightRange * finalScale) / 2 - padding,
      }
    };
  }, [data, height]);

  // Color interpolation based on mode
  const getColor = useCallback((value: number, mode: ColorMode) => {
    if (mode === 'speed') {
      const range = data.speed_range || { min: 50, max: 350 };
      const normalized = (value - range.min) / (range.max - range.min);
      // Blue (slow) -> Green -> Yellow -> Red (fast)
      if (normalized < 0.33) {
        const t = normalized / 0.33;
        return `rgb(${Math.round(t * 255)}, ${Math.round(t * 255)}, 255)`;
      } else if (normalized < 0.66) {
        const t = (normalized - 0.33) / 0.33;
        return `rgb(${Math.round(255 * (1 - t) + 255 * t)}, 255, ${Math.round(255 * (1 - t))})`;
      } else {
        const t = (normalized - 0.66) / 0.34;
        return `rgb(255, ${Math.round(255 * (1 - t))}, 0)`;
      }
    } else {
      // Gear: discrete colors
      const gearColors = [
        '#4444ff', // 1
        '#00aaff', // 2
        '#00ffaa', // 3
        '#00ff00', // 4
        '#aaff00', // 5
        '#ffff00', // 6
        '#ffaa00', // 7
        '#ff0000', // 8
      ];
      return gearColors[Math.min(value - 1, 7)] || '#888';
    }
  }, [data.speed_range]);

  // Generate path segments with colors
  const pathSegments = useMemo(() => {
    const segments: Array<{
      d: string;
      color: string;
      driver: 'driver1' | 'driver2';
    }> = [];

    const createSegments = (points: typeof data.driver_1, driverId: 'driver1' | 'driver2') => {
      if (points.length < 2) return;
      
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        const x1 = p1.x * scale + translate.x;
        const y1 = p1.y * scale + translate.y;
        const x2 = p2.x * scale + translate.x;
        const y2 = p2.y * scale + translate.y;
        
        const value = colorMode === 'speed' ? p1.speed : p1.gear;
        
        segments.push({
          d: `M ${x1} ${y1} L ${x2} ${y2}`,
          color: getColor(value, colorMode),
          driver: driverId,
        });
      }
    };

    if (selectedDriver === 'driver1' || selectedDriver === 'both') {
      createSegments(data.driver_1, 'driver1');
    }
    if (selectedDriver === 'driver2' || selectedDriver === 'both') {
      createSegments(data.driver_2, 'driver2');
    }

    return segments;
  }, [data, scale, translate, colorMode, selectedDriver, getColor]);

  // Track outline (for reference)
  const trackOutline = useMemo(() => {
    if (data.track_path.length < 2) return '';
    return data.track_path
      .map((p, i) => {
        const x = p.x * scale + translate.x;
        const y = p.y * scale + translate.y;
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ') + ' Z';
  }, [data.track_path, scale, translate]);

  if (!data.driver_1.length && !data.driver_2.length) {
    return (
      <div className="apex-card p-4 text-center text-gray-400">
        <p>No track map data available</p>
      </div>
    );
  }

  return (
    <div className="apex-card p-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Color by:</span>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
            className="apex-select text-sm py-1 px-2"
          >
            <option value="speed">Speed</option>
            <option value="gear">Gear</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Show:</span>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value as DriverSelect)}
            className="apex-select text-sm py-1 px-2"
          >
            <option value="both">Both Drivers</option>
            <option value="driver1">{driver1.id}</option>
            <option value="driver2">{driver2.id}</option>
          </select>
        </div>
      </div>

      {/* SVG Track Map */}
      <svg
        width="100%"
        height={height - 80}
        viewBox={`0 0 800 ${height - 80}`}
        className="bg-f1-dark rounded-lg"
      >
        {/* Track outline (faint) */}
        <path
          d={trackOutline}
          fill="none"
          stroke="#333"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Colored segments */}
        {pathSegments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.color}
            strokeWidth={selectedDriver === 'both' ? (seg.driver === 'driver1' ? 4 : 3) : 5}
            strokeLinecap="round"
            opacity={selectedDriver === 'both' ? (seg.driver === 'driver1' ? 1 : 0.7) : 1}
          />
        ))}

        {/* Start/Finish marker */}
        {data.track_path.length > 0 && (
          <g>
            <circle
              cx={data.track_path[0].x * scale + translate.x}
              cy={data.track_path[0].y * scale + translate.y}
              r="8"
              fill="#E10600"
              stroke="#FFF"
              strokeWidth="2"
            />
            <text
              x={data.track_path[0].x * scale + translate.x + 15}
              y={data.track_path[0].y * scale + translate.y + 5}
              fill="#FFF"
              fontSize="12"
            >
              S/F
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {colorMode === 'speed' ? (
          <div className="flex items-center gap-2">
            <div className="w-32 h-4 rounded" style={{
              background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)'
            }} />
            <div className="flex justify-between w-32 text-xs text-gray-400">
              <span>{data.speed_range?.min?.toFixed(0) || '50'}</span>
              <span>km/h</span>
              <span>{data.speed_range?.max?.toFixed(0) || '350'}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(gear => (
              <div key={gear} className="flex flex-col items-center">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getColor(gear, 'gear') }}
                />
                <span className="text-gray-400">{gear}</span>
              </div>
            ))}
          </div>
        )}
        
        {selectedDriver === 'both' && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: driver1.color }} />
              <span style={{ color: driver1.color }}>{driver1.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded opacity-70" style={{ backgroundColor: driver2.color }} />
              <span style={{ color: driver2.color }}>{driver2.id}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
