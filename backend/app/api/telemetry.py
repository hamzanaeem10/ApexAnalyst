"""
Telemetry API Router
Handles telemetry comparison endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging
import pandas as pd
import numpy as np

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


@router.get("/race-analysis/{session_id}")
async def get_race_analysis(session_id: str):
    """
    Get comprehensive race analysis data including:
    - Race pace (lap times per driver for box plots)
    - Tyre strategies (compound usage per driver)
    - Position changes throughout the race
    - Average gap to leader/fastest driver
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        laps = session.laps
        results = session.results
        
        # Get event info
        event_name = session.event['EventName'] if hasattr(session, 'event') else 'Race'
        year = session.event['EventDate'].year if hasattr(session, 'event') else 2025
        
        # Get all drivers in finishing order
        drivers_order = results['Abbreviation'].tolist() if 'Abbreviation' in results.columns else laps['Driver'].unique().tolist()
        
        # 1. Race Pace Data (for box plots)
        race_pace_data = []
        for driver in drivers_order:
            driver_laps = laps.pick_drivers(driver)
            valid_laps = driver_laps[driver_laps['LapTime'].notna()]
            
            if len(valid_laps) > 0:
                lap_times = [lt.total_seconds() for lt in valid_laps['LapTime']]
                # Filter out outliers (pit laps, safety car laps) - laps > 150% of median
                median_time = np.median(lap_times)
                filtered_times = [t for t in lap_times if t < median_time * 1.5]
                
                if filtered_times:
                    race_pace_data.append({
                        "driver": driver,
                        "lap_times": filtered_times,
                        "min": min(filtered_times),
                        "max": max(filtered_times),
                        "median": np.median(filtered_times),
                        "q1": np.percentile(filtered_times, 25),
                        "q3": np.percentile(filtered_times, 75),
                        "mean": np.mean(filtered_times)
                    })
        
        # 2. Tyre Strategy Data
        tyre_strategy_data = []
        for driver in drivers_order:
            driver_laps = laps.pick_drivers(driver)
            
            stints = []
            current_compound = None
            stint_start = 1
            
            for _, lap in driver_laps.iterrows():
                compound = lap.get('Compound', 'UNKNOWN')
                lap_num = int(lap['LapNumber'])
                
                if compound != current_compound:
                    if current_compound is not None:
                        stints.append({
                            "compound": current_compound,
                            "start_lap": stint_start,
                            "end_lap": lap_num - 1,
                            "laps": lap_num - stint_start
                        })
                    current_compound = compound
                    stint_start = lap_num
            
            # Add final stint
            if current_compound is not None:
                final_lap = int(driver_laps['LapNumber'].max())
                stints.append({
                    "compound": current_compound,
                    "start_lap": stint_start,
                    "end_lap": final_lap,
                    "laps": final_lap - stint_start + 1
                })
            
            tyre_strategy_data.append({
                "driver": driver,
                "stints": stints,
                "total_laps": int(driver_laps['LapNumber'].max()) if len(driver_laps) > 0 else 0
            })
        
        # 3. Position Data (lap by lap positions)
        position_data = []
        max_laps = int(laps['LapNumber'].max()) if len(laps) > 0 else 0
        
        for driver in drivers_order:
            driver_laps = laps.pick_drivers(driver)
            positions = []
            
            for lap_num in range(1, max_laps + 1):
                lap = driver_laps[driver_laps['LapNumber'] == lap_num]
                if len(lap) > 0 and pd.notna(lap.iloc[0].get('Position')):
                    positions.append({
                        "lap": lap_num,
                        "position": int(lap.iloc[0]['Position'])
                    })
            
            if positions:
                position_data.append({
                    "driver": driver,
                    "positions": positions
                })
        
        # 4. Average Gap to Fastest Driver
        # Find the driver with fastest average pace
        if race_pace_data:
            fastest_driver = min(race_pace_data, key=lambda x: x['mean'])
            fastest_avg = fastest_driver['mean']
            
            gap_data = []
            for driver_pace in race_pace_data:
                gap = driver_pace['mean'] - fastest_avg
                gap_data.append({
                    "driver": driver_pace['driver'],
                    "gap": round(gap, 3),
                    "avg_lap_time": round(driver_pace['mean'], 3),
                    "is_fastest": driver_pace['driver'] == fastest_driver['driver']
                })
            
            # Sort by gap
            gap_data.sort(key=lambda x: x['gap'])
        else:
            gap_data = []
            fastest_driver = {"driver": "N/A", "mean": 0}
        
        # Get team colors for each driver
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        return {
            "event_name": event_name,
            "year": year,
            "total_laps": max_laps,
            "race_pace": race_pace_data,
            "tyre_strategies": tyre_strategy_data,
            "positions": position_data,
            "gap_analysis": gap_data,
            "fastest_driver": fastest_driver['driver'],
            "fastest_avg_time": round(fastest_driver['mean'], 3) if race_pace_data else 0,
            "driver_colors": driver_colors
        }
        
    except Exception as e:
        logger.error(f"Error getting race analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get race analysis: {str(e)}"
        )
