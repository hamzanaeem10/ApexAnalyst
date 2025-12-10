"""
Circuit Segment API Router
Handles segment analysis endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
import logging

from app.models.schemas import (
    SegmentAnalysisRequest, SegmentAnalysisResponse
)
from app.services.session_service import session_manager
from app.services.segment_service import segment_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Circuit"])


@router.post("/segment", response_model=SegmentAnalysisResponse)
async def analyze_segment(
    request: SegmentAnalysisRequest,
    session_id: str
):
    """
    Analyze performance through a track segment.
    
    Returns speed leaderboard, team distributions, and speed traces.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found. Please load a session first."
            )
        
        if request.end_dist <= request.start_dist:
            raise HTTPException(
                status_code=400,
                detail="End distance must be greater than start distance"
            )
        
        result = segment_service.calculate_segment_metrics(
            session=session,
            start_dist=request.start_dist,
            end_dist=request.end_dist,
            team_filter=request.team_filter
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing segment: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze segment: {str(e)}"
        )


@router.get("/track-info/{session_id}")
async def get_track_info(session_id: str):
    """Get track information including length and available segments"""
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        # Get track layout from fastest lap
        try:
            fastest_lap = session.laps.pick_fastest()
            tel = fastest_lap.get_telemetry()
            track_length = float(tel['Distance'].max())
        except:
            track_length = 5000.0
        
        event = session.event
        
        return {
            "session_id": session_id,
            "track_name": event.get('EventName', 'Unknown'),
            "location": event.get('Location', 'Unknown'),
            "country": event.get('Country', 'Unknown'),
            "track_length": track_length,
            "suggested_segments": [
                {"name": f"Segment {i+1}", "start": i * (track_length/10), "end": (i+1) * (track_length/10)}
                for i in range(10)
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting track info: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get track info: {str(e)}"
        )
