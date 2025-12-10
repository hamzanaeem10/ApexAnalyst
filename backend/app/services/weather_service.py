"""
Weather Analysis Service
Handles weather correlation and track condition impact analysis
"""

import pandas as pd
import numpy as np
from scipy import stats
from typing import Optional, List, Dict, Any
import logging

from app.models.schemas import (
    CorrelationPoint, TemperaturePoint, WeatherImpactMetric,
    WeatherCorrelationResponse
)

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for weather correlation analysis"""
    
    @staticmethod
    def correlate_weather_laps(
        session,
        lap_window_size: int = 5,
        min_laps: int = 5
    ) -> WeatherCorrelationResponse:
        """
        Analyze weather correlation with lap times
        """
        weather = session.weather_data
        all_laps = session.laps
        
        if weather.empty:
            raise ValueError("No weather data available for this session")
        
        # Filter valid laps
        valid_laps = all_laps[all_laps['LapTime'].notna() & all_laps['IsAccurate']].copy()
        
        if len(valid_laps) < min_laps:
            raise ValueError(f"Insufficient valid laps (need {min_laps}, got {len(valid_laps)})")
        
        valid_laps['LapTimeSeconds'] = valid_laps['LapTime'].dt.total_seconds()
        
        # Build correlation data
        correlation_data = []
        
        for _, lap in valid_laps.iterrows():
            lap_time_ref = lap.get('Time', lap.get('LapStartTime'))
            if pd.isna(lap_time_ref):
                continue
            
            # Find closest weather reading
            time_diffs = abs(weather['Time'] - lap_time_ref)
            closest_idx = time_diffs.idxmin()
            closest_weather = weather.loc[closest_idx]
            
            correlation_data.append({
                'LapTime': lap['LapTimeSeconds'],
                'TrackTemp': closest_weather.get('TrackTemp', np.nan),
                'AirTemp': closest_weather.get('AirTemp', np.nan),
                'Humidity': closest_weather.get('Humidity', np.nan),
                'LapNumber': lap['LapNumber']
            })
        
        if not correlation_data:
            raise ValueError("Could not correlate laps with weather data")
        
        corr_df = pd.DataFrame(correlation_data)
        
        # Create rolling window averages for correlation points
        corr_points = []
        for i in range(0, len(corr_df) - lap_window_size + 1, lap_window_size):
            window = corr_df.iloc[i:i + lap_window_size]
            corr_points.append(CorrelationPoint(
                track_temp=float(window['TrackTemp'].mean()),
                air_temp=float(window['AirTemp'].mean()),
                humidity=float(window['Humidity'].mean()) if 'Humidity' in window else 0,
                avg_lap_time=float(window['LapTime'].mean()),
                window_start_lap=int(window['LapNumber'].min()),
                window_end_lap=int(window['LapNumber'].max())
            ))
        
        # Temperature evolution
        temp_evolution = []
        for _, row in weather.iterrows():
            time_minutes = row['Time'].total_seconds() / 60 if pd.notna(row.get('Time')) else 0
            temp_evolution.append(TemperaturePoint(
                time_minutes=float(time_minutes),
                track_temp=float(row.get('TrackTemp', 0)),
                air_temp=float(row.get('AirTemp', 0)),
                humidity=float(row.get('Humidity', 0)) if pd.notna(row.get('Humidity')) else None
            ))
        
        # Calculate impact metrics
        impact_metrics = []
        
        # Track temperature impact
        valid_track = corr_df[corr_df['TrackTemp'].notna()]
        if len(valid_track) > 2:
            slope, _, r_value, _, _ = stats.linregress(
                valid_track['TrackTemp'], valid_track['LapTime']
            )
            impact_metrics.append(WeatherImpactMetric(
                variable="Track Temperature",
                delta_per_unit=float(slope),
                unit="°C",
                r_squared=float(r_value ** 2),
                direction="slower" if slope > 0 else "faster"
            ))
        
        # Air temperature impact
        valid_air = corr_df[corr_df['AirTemp'].notna()]
        if len(valid_air) > 2:
            slope, _, r_value, _, _ = stats.linregress(
                valid_air['AirTemp'], valid_air['LapTime']
            )
            impact_metrics.append(WeatherImpactMetric(
                variable="Air Temperature",
                delta_per_unit=float(slope),
                unit="°C",
                r_squared=float(r_value ** 2),
                direction="slower" if slope > 0 else "faster"
            ))
        
        # Humidity impact
        valid_humid = corr_df[corr_df['Humidity'].notna()]
        if len(valid_humid) > 2:
            slope, _, r_value, _, _ = stats.linregress(
                valid_humid['Humidity'], valid_humid['LapTime']
            )
            impact_metrics.append(WeatherImpactMetric(
                variable="Humidity",
                delta_per_unit=float(slope),
                unit="%",
                r_squared=float(r_value ** 2),
                direction="slower" if slope > 0 else "faster"
            ))
        
        # Check for rainfall
        rainfall_detected = weather.get('Rainfall', pd.Series([False])).any()
        
        # Temperature range
        temp_range = {
            "track_min": float(weather['TrackTemp'].min()) if 'TrackTemp' in weather else 0,
            "track_max": float(weather['TrackTemp'].max()) if 'TrackTemp' in weather else 0,
            "air_min": float(weather['AirTemp'].min()) if 'AirTemp' in weather else 0,
            "air_max": float(weather['AirTemp'].max()) if 'AirTemp' in weather else 0
        }
        
        return WeatherCorrelationResponse(
            correlation_data=corr_points,
            temperature_evolution=temp_evolution,
            impact_metrics=impact_metrics,
            rainfall_detected=bool(rainfall_detected),
            temp_range=temp_range
        )


# Singleton instance
weather_service = WeatherService()
