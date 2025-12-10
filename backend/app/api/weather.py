"""
Weather API Router
Handles weather correlation analysis endpoints
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.schemas import (
    WeatherCorrelationRequest, WeatherCorrelationResponse
)
from app.services.session_service import session_manager
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Weather"])


@router.post("/correlation", response_model=WeatherCorrelationResponse)
async def analyze_weather_correlation(
    request: WeatherCorrelationRequest,
    session_id: str
):
    """
    Analyze weather correlation with lap times.
    
    Returns correlation data, temperature evolution, 
    and quantified impact metrics (delta per degree).
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found. Please load a session first."
            )
        
        result = weather_service.correlate_weather_laps(
            session=session,
            lap_window_size=request.lap_window_size,
            min_laps=request.min_laps
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing weather correlation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze weather correlation: {str(e)}"
        )


@router.get("/raw/{session_id}")
async def get_raw_weather_data(session_id: str):
    """Get raw weather data for a session"""
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        weather = session.weather_data
        
        if weather.empty:
            return {"message": "No weather data available", "data": []}
        
        data = []
        for _, row in weather.iterrows():
            data.append({
                "time": row['Time'].total_seconds() if hasattr(row.get('Time'), 'total_seconds') else 0,
                "air_temp": float(row.get('AirTemp', 0)),
                "track_temp": float(row.get('TrackTemp', 0)),
                "humidity": float(row.get('Humidity', 0)) if row.get('Humidity') is not None else None,
                "wind_speed": float(row.get('WindSpeed', 0)) if row.get('WindSpeed') is not None else None,
                "wind_direction": float(row.get('WindDirection', 0)) if row.get('WindDirection') is not None else None,
                "rainfall": bool(row.get('Rainfall', False))
            })
        
        return {
            "session_id": session_id,
            "data_points": len(data),
            "data": data
        }
        
    except Exception as e:
        logger.error(f"Error getting weather data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get weather data: {str(e)}"
        )
