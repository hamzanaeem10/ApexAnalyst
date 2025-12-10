"""
Session API Router
Handles session loading and schedule endpoints
"""

from fastapi import APIRouter, HTTPException, Path
from typing import List
import logging

from app.models.schemas import (
    SessionLoadRequest, SessionLoadResponse, 
    ScheduleResponse, EventInfo, APIResponse
)
from app.services.session_service import session_manager, get_event_schedule

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Session"])


@router.post("/load", response_model=SessionLoadResponse)
async def load_session(request: SessionLoadRequest):
    """
    Load an F1 session and return driver/team/track data.
    This is the first call to make before any analysis endpoints.
    """
    try:
        session_id, session = session_manager.get_session(
            request.year,
            request.grand_prix,
            request.session_name.value
        )
        
        drivers = session_manager.extract_drivers(session)
        teams = session_manager.extract_teams(session)
        track_data = session_manager.extract_track_data(session)
        
        return SessionLoadResponse(
            session_id=session_id,
            year=request.year,
            grand_prix=request.grand_prix,
            session_name=request.session_name.value,
            drivers=drivers,
            teams=teams,
            track_data=track_data
        )
        
    except Exception as e:
        logger.error(f"Error loading session: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load session: {str(e)}"
        )


@router.get("/schedule/{year}", response_model=ScheduleResponse)
async def get_schedule(year: int = Path(..., ge=2018, le=2025)):
    """Get the race schedule for a given year"""
    try:
        schedule = get_event_schedule(year)
        
        events = []
        for _, row in schedule.iterrows():
            if row.get('EventFormat') == 'testing':
                continue
            
            events.append(EventInfo(
                round_number=int(row.get('RoundNumber', 0)),
                event_name=row.get('EventName', ''),
                country=row.get('Country', ''),
                location=row.get('Location', ''),
                event_date=str(row.get('EventDate', '')),
                event_format=row.get('EventFormat', 'conventional')
            ))
        
        return ScheduleResponse(year=year, events=events)
        
    except Exception as e:
        logger.error(f"Error getting schedule: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get schedule: {str(e)}"
        )


@router.get("/cache/info")
async def get_cache_info():
    """Get information about cached sessions"""
    return session_manager.get_cache_info()


@router.delete("/cache/clear")
async def clear_cache():
    """Clear all cached sessions"""
    count = session_manager.clear_all_sessions()
    return {"message": f"Cleared {count} sessions from cache"}
