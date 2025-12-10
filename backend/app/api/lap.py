"""
Lap Analysis API Router
Handles lap performance analysis endpoints
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.schemas import (
    LapPerformanceRequest, LapPerformanceResponse
)
from app.services.session_service import session_manager
from app.services.lap_service import lap_analysis_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Lap Analysis"])


@router.post("/performance", response_model=LapPerformanceResponse)
async def analyze_lap_performance(
    request: LapPerformanceRequest,
    session_id: str
):
    """
    Analyze lap performance for a driver.
    
    Returns theoretical vs actual lap times, sector deltas, 
    stint analysis, and tire degradation rates.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found. Please load a session first."
            )
        
        result = lap_analysis_service.analyze_driver_performance(
            session=session,
            driver_id=request.driver_id
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing lap performance: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze lap performance: {str(e)}"
        )


@router.get("/summary/{session_id}")
async def get_session_lap_summary(session_id: str):
    """Get summary of all laps in a session"""
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        laps = session.laps
        valid_laps = laps[laps['LapTime'].notna()]
        
        # Session fastest lap
        fastest_lap = valid_laps.loc[valid_laps['LapTime'].idxmin()] if not valid_laps.empty else None
        
        summary = {
            "total_laps": len(laps),
            "valid_laps": len(valid_laps),
            "fastest_lap": {
                "driver": fastest_lap['Driver'] if fastest_lap is not None else None,
                "lap_number": int(fastest_lap['LapNumber']) if fastest_lap is not None else None,
                "time": fastest_lap['LapTime'].total_seconds() if fastest_lap is not None else None
            },
            "drivers_with_laps": laps['Driver'].nunique()
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting lap summary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get lap summary: {str(e)}"
        )
