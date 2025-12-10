"""
Race API Router
Handles race gap analysis and race trace endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging
import pandas as pd
import numpy as np

from app.services.session_service import session_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Race"])


@router.get("/gaps/{session_id}")
async def get_race_gaps(
    session_id: str,
    benchmark_driver: str = Query(..., description="Reference driver abbreviation (e.g., VER, HAM)"),
    drivers: Optional[str] = Query(None, description="Comma-separated driver abbreviations to compare (optional, defaults to all)")
):
    """
    Get cumulative time deltas relative to a benchmark driver for Race Trace visualization.
    
    Returns lap-by-lap gap data for each driver relative to the benchmark driver.
    Positive values mean the driver is behind the benchmark, negative means ahead.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found. Please load a session first."
            )
        
        laps = session.laps
        results = session.results
        
        # Get event info
        event_name = session.event['EventName'] if hasattr(session, 'event') else 'Race'
        year = session.event['EventDate'].year if hasattr(session, 'event') else 2025
        
        # Parse drivers to compare
        if drivers:
            compare_drivers = [d.strip() for d in drivers.split(',')]
        else:
            # Get all drivers from results in finishing order
            compare_drivers = results['Abbreviation'].tolist() if 'Abbreviation' in results.columns else laps['Driver'].unique().tolist()
        
        # Ensure benchmark driver is in the list
        if benchmark_driver not in compare_drivers:
            compare_drivers.insert(0, benchmark_driver)
        
        # Get benchmark driver's lap times
        benchmark_laps = laps.pick_drivers(benchmark_driver)
        benchmark_times = {}
        
        for _, lap in benchmark_laps.iterrows():
            if pd.notna(lap['LapTime']):
                lap_num = int(lap['LapNumber'])
                benchmark_times[lap_num] = lap['LapTime'].total_seconds()
        
        if not benchmark_times:
            raise HTTPException(
                status_code=400,
                detail=f"No valid lap times found for benchmark driver {benchmark_driver}"
            )
        
        # Calculate cumulative gap for each driver
        max_laps = int(laps['LapNumber'].max()) if len(laps) > 0 else 0
        gaps_data = []
        
        # Get driver colors
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        for driver in compare_drivers:
            driver_laps = laps.pick_drivers(driver)
            driver_times = {}
            
            for _, lap in driver_laps.iterrows():
                if pd.notna(lap['LapTime']):
                    lap_num = int(lap['LapNumber'])
                    driver_times[lap_num] = lap['LapTime'].total_seconds()
            
            # Calculate cumulative gap lap by lap
            cumulative_gap = 0.0
            gap_by_lap = []
            
            for lap_num in range(1, max_laps + 1):
                if lap_num in driver_times and lap_num in benchmark_times:
                    # Gap = driver time - benchmark time (positive = behind benchmark)
                    lap_delta = driver_times[lap_num] - benchmark_times[lap_num]
                    cumulative_gap += lap_delta
                    
                    gap_by_lap.append({
                        "lap": lap_num,
                        "gap": round(cumulative_gap, 3),
                        "lap_delta": round(lap_delta, 3)
                    })
                elif lap_num in driver_times:
                    # Driver has time but benchmark doesn't - use last known gap
                    gap_by_lap.append({
                        "lap": lap_num,
                        "gap": round(cumulative_gap, 3),
                        "lap_delta": None
                    })
            
            if gap_by_lap:
                gaps_data.append({
                    "driver": driver,
                    "color": driver_colors.get(driver, "#FFFFFF"),
                    "is_benchmark": driver == benchmark_driver,
                    "gaps": gap_by_lap,
                    "final_gap": gap_by_lap[-1]["gap"] if gap_by_lap else 0
                })
        
        # Sort by final gap (benchmark first, then by gap ascending)
        gaps_data.sort(key=lambda x: (not x["is_benchmark"], x["final_gap"]))
        
        return {
            "event_name": event_name,
            "year": year,
            "benchmark_driver": benchmark_driver,
            "total_laps": max_laps,
            "driver_gaps": gaps_data,
            "driver_colors": driver_colors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating race gaps: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate race gaps: {str(e)}"
        )


@router.get("/drivers/{session_id}")
async def get_race_drivers(session_id: str):
    """Get all drivers in a race session for benchmark selection"""
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        results = session.results
        drivers = []
        
        for _, row in results.iterrows():
            drivers.append({
                "abbreviation": row['Abbreviation'],
                "full_name": row.get('FullName', row['Abbreviation']),
                "team": row.get('TeamName', 'Unknown'),
                "color": f"#{row.get('TeamColor', 'FFFFFF')}",
                "position": int(row.get('Position', 0)) if pd.notna(row.get('Position')) else 0
            })
        
        # Sort by finishing position
        drivers.sort(key=lambda x: x['position'] if x['position'] > 0 else 999)
        
        return drivers
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting race drivers: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get race drivers: {str(e)}"
        )
