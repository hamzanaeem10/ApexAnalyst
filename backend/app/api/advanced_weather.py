"""
Advanced Weather API Router
Handles weather timeline, wind rose, and track evolution
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging
import pandas as pd
import numpy as np
from scipy import stats

from app.services.session_service import session_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Advanced Weather"])


@router.get("/timeline/{session_id}")
async def get_weather_timeline(session_id: str):
    """
    Get complete weather timeline with temperature, humidity, pressure, and rain overlay.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        weather = session.weather_data
        
        if weather.empty:
            return {"session_id": session_id, "message": "No weather data available", "timeline": []}
        
        timeline_data = []
        
        for _, row in weather.iterrows():
            time_seconds = row['Time'].total_seconds() if hasattr(row.get('Time'), 'total_seconds') else 0
            
            timeline_data.append({
                'time_seconds': time_seconds,
                'time_minutes': round(time_seconds / 60, 2),
                'air_temp': float(row.get('AirTemp', 0)) if pd.notna(row.get('AirTemp')) else None,
                'track_temp': float(row.get('TrackTemp', 0)) if pd.notna(row.get('TrackTemp')) else None,
                'humidity': float(row.get('Humidity', 0)) if pd.notna(row.get('Humidity')) else None,
                'pressure': float(row.get('Pressure', 0)) if pd.notna(row.get('Pressure')) else None,
                'wind_speed': float(row.get('WindSpeed', 0)) if pd.notna(row.get('WindSpeed')) else None,
                'wind_direction': float(row.get('WindDirection', 0)) if pd.notna(row.get('WindDirection')) else None,
                'rainfall': bool(row.get('Rainfall', False))
            })
        
        # Calculate summary stats
        df = pd.DataFrame(timeline_data)
        
        summary = {
            'air_temp': {
                'min': round(float(df['air_temp'].min()), 1) if df['air_temp'].notna().any() else None,
                'max': round(float(df['air_temp'].max()), 1) if df['air_temp'].notna().any() else None,
                'mean': round(float(df['air_temp'].mean()), 1) if df['air_temp'].notna().any() else None
            },
            'track_temp': {
                'min': round(float(df['track_temp'].min()), 1) if df['track_temp'].notna().any() else None,
                'max': round(float(df['track_temp'].max()), 1) if df['track_temp'].notna().any() else None,
                'mean': round(float(df['track_temp'].mean()), 1) if df['track_temp'].notna().any() else None
            },
            'humidity': {
                'min': round(float(df['humidity'].min()), 1) if df['humidity'].notna().any() else None,
                'max': round(float(df['humidity'].max()), 1) if df['humidity'].notna().any() else None,
                'mean': round(float(df['humidity'].mean()), 1) if df['humidity'].notna().any() else None
            },
            'wind_speed': {
                'min': round(float(df['wind_speed'].min()), 1) if df['wind_speed'].notna().any() else None,
                'max': round(float(df['wind_speed'].max()), 1) if df['wind_speed'].notna().any() else None,
                'mean': round(float(df['wind_speed'].mean()), 1) if df['wind_speed'].notna().any() else None
            },
            'rainfall_detected': bool(df['rainfall'].any())
        }
        
        # Detect rain periods
        rain_periods = []
        in_rain = False
        rain_start = None
        
        for point in timeline_data:
            if point['rainfall'] and not in_rain:
                in_rain = True
                rain_start = point['time_minutes']
            elif not point['rainfall'] and in_rain:
                in_rain = False
                rain_periods.append({
                    'start': rain_start,
                    'end': point['time_minutes']
                })
        
        if in_rain and rain_start is not None:
            rain_periods.append({
                'start': rain_start,
                'end': timeline_data[-1]['time_minutes'] if timeline_data else 0
            })
        
        return {
            "session_id": session_id,
            "data_points": len(timeline_data),
            "duration_minutes": round(timeline_data[-1]['time_minutes'], 1) if timeline_data else 0,
            "summary": summary,
            "rain_periods": rain_periods,
            "timeline": timeline_data
        }
        
    except Exception as e:
        logger.error(f"Error getting weather timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wind-rose/{session_id}")
async def get_wind_rose(session_id: str):
    """
    Get wind rose data (speed and direction distribution).
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        weather = session.weather_data
        
        if weather.empty:
            return {"session_id": session_id, "message": "No weather data available", "wind_data": []}
        
        # Direction bins (N, NE, E, SE, S, SW, W, NW)
        direction_bins = [0, 45, 90, 135, 180, 225, 270, 315, 360]
        direction_labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        
        # Speed bins
        speed_bins = [0, 5, 10, 15, 20, 25, 100]  # km/h
        speed_labels = ['0-5', '5-10', '10-15', '15-20', '20-25', '25+']
        
        wind_data = []
        
        for _, row in weather.iterrows():
            if pd.notna(row.get('WindDirection')) and pd.notna(row.get('WindSpeed')):
                direction = float(row['WindDirection'])
                speed = float(row['WindSpeed'])
                
                # Normalize direction to 0-360
                direction = direction % 360
                
                wind_data.append({
                    'direction': direction,
                    'speed': speed
                })
        
        if not wind_data:
            return {"session_id": session_id, "message": "No wind data available", "wind_data": []}
        
        # Aggregate data for rose chart
        rose_data = []
        
        for i, label in enumerate(direction_labels):
            dir_min = direction_bins[i]
            dir_max = direction_bins[i + 1]
            
            # Handle wrap-around for North
            if label == 'N':
                dir_winds = [w for w in wind_data if w['direction'] >= 315 or w['direction'] < 45]
            else:
                dir_winds = [w for w in wind_data if dir_min <= w['direction'] < dir_max]
            
            if dir_winds:
                speeds = [w['speed'] for w in dir_winds]
                rose_data.append({
                    'direction': label,
                    'angle': (dir_min + dir_max) / 2 if label != 'N' else 0,
                    'count': len(dir_winds),
                    'percentage': round(len(dir_winds) / len(wind_data) * 100, 1),
                    'avg_speed': round(np.mean(speeds), 1),
                    'max_speed': round(max(speeds), 1),
                    'speed_distribution': {
                        speed_labels[j]: len([s for s in speeds if speed_bins[j] <= s < speed_bins[j+1]])
                        for j in range(len(speed_labels))
                    }
                })
            else:
                rose_data.append({
                    'direction': label,
                    'angle': (dir_min + dir_max) / 2 if label != 'N' else 0,
                    'count': 0,
                    'percentage': 0,
                    'avg_speed': 0,
                    'max_speed': 0,
                    'speed_distribution': {sl: 0 for sl in speed_labels}
                })
        
        # Dominant wind direction
        dominant = max(rose_data, key=lambda x: x['count'])
        
        return {
            "session_id": session_id,
            "total_samples": len(wind_data),
            "dominant_direction": dominant['direction'],
            "avg_wind_speed": round(np.mean([w['speed'] for w in wind_data]), 1),
            "max_wind_speed": round(max([w['speed'] for w in wind_data]), 1),
            "rose_data": rose_data
        }
        
    except Exception as e:
        logger.error(f"Error getting wind rose: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/track-evolution/{session_id}")
async def get_track_evolution(session_id: str):
    """
    Analyze track evolution (grip level improvement over session).
    Correlates lap times with session time to show rubber buildup effect.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        weather = session.weather_data
        
        # Get accurate laps only
        if 'IsAccurate' in laps.columns:
            accurate_laps = laps[laps['IsAccurate'] == True].copy()
        else:
            accurate_laps = laps.copy()
        
        if len(accurate_laps) < 10:
            return {"session_id": session_id, "message": "Insufficient data", "evolution": []}
        
        # Calculate median lap time per lap number (session progression)
        lap_progression = accurate_laps.groupby('LapNumber').apply(
            lambda x: x['LapTime'].apply(lambda t: t.total_seconds() if pd.notna(t) else None).median()
        ).dropna()
        
        evolution_data = []
        
        for lap_num, median_time in lap_progression.items():
            if pd.notna(median_time) and 60 < median_time < 200:  # Valid lap time range
                evolution_data.append({
                    'lap': int(lap_num),
                    'median_lap_time': round(median_time, 3)
                })
        
        if len(evolution_data) < 5:
            return {"session_id": session_id, "message": "Insufficient data", "evolution": []}
        
        # Calculate track evolution rate (improvement over session)
        x = np.array([d['lap'] for d in evolution_data])
        y = np.array([d['median_lap_time'] for d in evolution_data])
        
        # Linear regression for overall trend
        slope, intercept, r_value, _, _ = stats.linregress(x, y)
        
        # Negative slope means track is getting faster (rubbeRed in)
        evolution_trend = 'improving' if slope < -0.01 else ('stable' if abs(slope) < 0.01 else 'degrading')
        
        # Add trend line to data
        for d in evolution_data:
            d['trend_time'] = round(intercept + slope * d['lap'], 3)
            d['delta_to_trend'] = round(d['median_lap_time'] - d['trend_time'], 3)
        
        # Estimate grip level (normalized 0-100)
        min_time = min(d['median_lap_time'] for d in evolution_data)
        max_time = max(d['median_lap_time'] for d in evolution_data)
        time_range = max_time - min_time if max_time > min_time else 1
        
        for d in evolution_data:
            d['grip_level'] = round(100 - ((d['median_lap_time'] - min_time) / time_range * 100), 1)
        
        return {
            "session_id": session_id,
            "total_laps": len(evolution_data),
            "evolution_rate_per_lap": round(slope, 4),  # seconds per lap (negative = faster)
            "evolution_trend": evolution_trend,
            "r_squared": round(r_value ** 2, 4),
            "fastest_lap_number": evolution_data[np.argmin(y)]['lap'],
            "time_improvement": round(evolution_data[0]['median_lap_time'] - evolution_data[-1]['median_lap_time'], 3),
            "evolution": evolution_data
        }
        
    except Exception as e:
        logger.error(f"Error analyzing track evolution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weather-lap-impact/{session_id}")
async def get_weather_lap_impact(
    session_id: str,
    driver: Optional[str] = Query(None, description="Filter by driver")
):
    """
    Correlate weather changes with lap time performance.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        weather = session.weather_data
        
        if driver:
            laps = laps.pick_drivers(driver)
        
        if weather.empty or len(laps) == 0:
            return {"session_id": session_id, "message": "Insufficient data", "impact_data": []}
        
        # Match weather to laps based on time
        impact_data = []
        
        for _, lap in laps.iterrows():
            if pd.isna(lap.get('LapTime')) or pd.isna(lap.get('Time')):
                continue
            
            lap_time = lap['LapTime'].total_seconds() if hasattr(lap['LapTime'], 'total_seconds') else None
            
            if lap_time is None or lap_time < 60 or lap_time > 200:
                continue
            
            # Find closest weather reading
            lap_timestamp = lap['Time'].total_seconds() if hasattr(lap['Time'], 'total_seconds') else 0
            
            closest_weather = None
            min_diff = float('inf')
            
            for _, w in weather.iterrows():
                w_time = w['Time'].total_seconds() if hasattr(w.get('Time'), 'total_seconds') else 0
                diff = abs(w_time - lap_timestamp)
                if diff < min_diff:
                    min_diff = diff
                    closest_weather = w
            
            if closest_weather is not None:
                impact_data.append({
                    'lap': int(lap['LapNumber']),
                    'driver': lap['Driver'],
                    'lap_time': round(lap_time, 3),
                    'track_temp': float(closest_weather.get('TrackTemp', 0)) if pd.notna(closest_weather.get('TrackTemp')) else None,
                    'air_temp': float(closest_weather.get('AirTemp', 0)) if pd.notna(closest_weather.get('AirTemp')) else None,
                    'humidity': float(closest_weather.get('Humidity', 0)) if pd.notna(closest_weather.get('Humidity')) else None,
                    'wind_speed': float(closest_weather.get('WindSpeed', 0)) if pd.notna(closest_weather.get('WindSpeed')) else None,
                    'rainfall': bool(closest_weather.get('Rainfall', False))
                })
        
        if len(impact_data) < 10:
            return {"session_id": session_id, "message": "Insufficient data", "impact_data": []}
        
        # Calculate correlations
        df = pd.DataFrame(impact_data)
        
        correlations = {}
        
        for col in ['track_temp', 'air_temp', 'humidity', 'wind_speed']:
            if df[col].notna().sum() > 10:
                valid_data = df[[col, 'lap_time']].dropna()
                if len(valid_data) > 10:
                    corr, p_value = stats.pearsonr(valid_data[col], valid_data['lap_time'])
                    correlations[col] = {
                        'correlation': round(corr, 4),
                        'p_value': round(p_value, 4),
                        'significant': p_value < 0.05
                    }
        
        return {
            "session_id": session_id,
            "driver": driver,
            "data_points": len(impact_data),
            "correlations": correlations,
            "impact_data": impact_data[:200]  # Limit for performance
        }
        
    except Exception as e:
        logger.error(f"Error analyzing weather impact: {e}")
        raise HTTPException(status_code=500, detail=str(e))
