"""
Telemetry API Router
Handles telemetry comparison endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.models.schemas import (
    TelemetryCompareRequest, TelemetryCompareResponse
)
from app.services.session_service import session_manager
from app.services.telemetry_service import telemetry_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Telemetry"])


@router.post("/compare", response_model=TelemetryCompareResponse)
async def compare_telemetry(
    request: TelemetryCompareRequest,
    session_id: str = Query(..., description="Session ID from /session/load")
):
    """
    Compare telemetry between two drivers.
    
    Requires a session to be loaded first via /session/load.
    Returns detailed telemetry data, trajectory, and statistics for both drivers.
    
    Note: If telemetry isn't loaded yet, this endpoint will wait for it to load.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found. Please load a session first."
            )
        
        result = telemetry_service.compare_drivers(
            session=session,
            session_id=session_id,  # Pass session_id for telemetry loading
            driver_id_1=request.driver_id_1,
            driver_id_2=request.driver_id_2,
            lap_number_1=request.lap_number_1,
            lap_number_2=request.lap_number_2,
            start_dist=request.start_dist,
            end_dist=request.end_dist
        )
        
        return TelemetryCompareResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error comparing telemetry: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compare telemetry: {str(e)}"
        )


@router.get("/drivers/{session_id}")
async def get_session_drivers(session_id: str):
    """Get all available drivers in a session"""
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        # Get unique driver codes from the session
        drivers = session.laps['Driver'].unique().tolist()
        return drivers
        
    except Exception as e:
        logger.error(f"Error getting drivers: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get drivers: {str(e)}"
        )


@router.get("/laps/{session_id}")
async def get_driver_laps(
    session_id: str,
    driver_id: str = Query(..., description="Driver abbreviation (e.g., VER, HAM)")
):
    """Get available laps for a specific driver in a session"""
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        laps = telemetry_service.get_available_laps(session, driver_id)
        return laps
        
    except Exception as e:
        logger.error(f"Error getting laps for driver {driver_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get laps: {str(e)}"
        )


@router.get("/status/{session_id}")
async def get_session_loading_status(session_id: str):
    """
    Get the loading status of a session.
    Useful for showing progress indicator in the frontend.
    """
    try:
        state = session_manager.get_loading_state(session_id)
        cache_info = session_manager.get_cache_info()
        session_info = cache_info.get("sessions", {}).get(session_id, {})
        
        return {
            "session_id": session_id,
            "state": state.value,
            "full_telemetry_loaded": session_info.get("full_load", False),
            "loaded_at": session_info.get("loaded_at")
        }
        
    except Exception as e:
        logger.error(f"Error getting session status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get session status: {str(e)}"
        )
