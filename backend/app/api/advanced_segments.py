"""
Advanced Segments API Router
Handles mini-sectors, theoretical best lap, corner analysis, and speed traces
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging
import pandas as pd
import numpy as np

from app.services.session_service import session_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Advanced Segments"])


@router.get("/mini-sectors/{session_id}")
async def get_mini_sector_analysis(
    session_id: str,
    num_sectors: int = Query(25, ge=10, le=50, description="Number of mini-sectors to divide track into")
):
    """
    Divide track into mini-sectors and identify fastest driver in each.
    Professional-level analysis showing exactly where time is gained/lost.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        results = session.results
        
        # Get driver colors
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        # Get fastest lap from each driver
        drivers = laps['Driver'].unique()
        driver_telemetry = {}
        
        for driver in drivers:
            try:
                driver_laps = laps.pick_drivers(driver)
                fastest = driver_laps.pick_fastest()
                
                if fastest is not None:
                    tel = fastest.get_telemetry()
                    if tel is not None and len(tel) > 0:
                        driver_telemetry[driver] = {
                            'distance': tel['Distance'].values,
                            'time': tel['Time'].apply(lambda t: t.total_seconds() if hasattr(t, 'total_seconds') else 0).values,
                            'speed': tel['Speed'].values if 'Speed' in tel.columns else np.zeros(len(tel))
                        }
            except Exception as e:
                logger.warning(f"Could not get telemetry for {driver}: {e}")
                continue
        
        if len(driver_telemetry) < 2:
            return {"session_id": session_id, "message": "Insufficient telemetry data", "mini_sectors": []}
        
        # Determine track length
        max_distance = max(tel['distance'].max() for tel in driver_telemetry.values())
        sector_length = max_distance / num_sectors
        
        mini_sectors = []
        
        for i in range(num_sectors):
            sector_start = i * sector_length
            sector_end = (i + 1) * sector_length
            
            sector_times = {}
            
            for driver, tel in driver_telemetry.items():
                # Find time at sector boundaries
                start_idx = np.searchsorted(tel['distance'], sector_start)
                end_idx = np.searchsorted(tel['distance'], sector_end)
                
                if start_idx < len(tel['time']) and end_idx <= len(tel['time']) and end_idx > start_idx:
                    start_time = tel['time'][start_idx]
                    end_time = tel['time'][min(end_idx, len(tel['time']) - 1)]
                    sector_time = end_time - start_time
                    
                    if sector_time > 0:
                        sector_times[driver] = {
                            'time': round(sector_time, 4),
                            'avg_speed': round(np.mean(tel['speed'][start_idx:end_idx]), 1) if end_idx > start_idx else 0
                        }
            
            if sector_times:
                fastest_driver = min(sector_times.keys(), key=lambda d: sector_times[d]['time'])
                fastest_time = sector_times[fastest_driver]['time']
                
                mini_sectors.append({
                    'sector': i + 1,
                    'start_distance': round(sector_start, 1),
                    'end_distance': round(sector_end, 1),
                    'fastest_driver': fastest_driver,
                    'fastest_color': driver_colors.get(fastest_driver, '#FFFFFF'),
                    'fastest_time': fastest_time,
                    'driver_times': {
                        driver: {
                            **data,
                            'delta': round(data['time'] - fastest_time, 4),
                            'color': driver_colors.get(driver, '#FFFFFF')
                        }
                        for driver, data in sector_times.items()
                    }
                })
        
        # Summary: dominant driver per sector count
        driver_dominance = {}
        for sector in mini_sectors:
            d = sector['fastest_driver']
            driver_dominance[d] = driver_dominance.get(d, 0) + 1
        
        dominance_ranking = sorted(
            [{'driver': d, 'sectors_won': c, 'percentage': round(c / len(mini_sectors) * 100, 1), 'color': driver_colors.get(d, '#FFFFFF')}
             for d, c in driver_dominance.items()],
            key=lambda x: -x['sectors_won']
        )
        
        return {
            "session_id": session_id,
            "track_length": round(max_distance, 1),
            "num_sectors": num_sectors,
            "sector_length": round(sector_length, 1),
            "mini_sectors": mini_sectors,
            "driver_dominance": dominance_ranking
        }
        
    except Exception as e:
        logger.error(f"Error analyzing mini-sectors: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/theoretical-best/{session_id}")
async def get_theoretical_best_lap(session_id: str):
    """
    Calculate theoretical best lap from best sectors of all drivers.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        results = session.results
        
        # Get driver colors
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        # Collect best sector times
        best_sectors = {'Sector1Time': {}, 'Sector2Time': {}, 'Sector3Time': {}}
        
        for _, lap in laps.iterrows():
            driver = lap['Driver']
            
            for sector in ['Sector1Time', 'Sector2Time', 'Sector3Time']:
                if pd.notna(lap.get(sector)):
                    time = lap[sector].total_seconds() if hasattr(lap[sector], 'total_seconds') else 0
                    if time > 0:
                        if driver not in best_sectors[sector] or time < best_sectors[sector][driver]:
                            best_sectors[sector][driver] = time
        
        # Find absolute best in each sector
        sector_bests = {}
        theoretical_components = []
        
        for sector_name, driver_times in best_sectors.items():
            if driver_times:
                best_driver = min(driver_times.keys(), key=lambda d: driver_times[d])
                best_time = driver_times[best_driver]
                
                sector_num = int(sector_name.replace('Sector', '').replace('Time', ''))
                
                sector_bests[sector_name] = {
                    'driver': best_driver,
                    'time': best_time,
                    'color': driver_colors.get(best_driver, '#FFFFFF')
                }
                
                theoretical_components.append({
                    'sector': sector_num,
                    'driver': best_driver,
                    'time': round(best_time, 3),
                    'color': driver_colors.get(best_driver, '#FFFFFF')
                })
        
        theoretical_time = sum(s['time'] for s in sector_bests.values())
        
        # Get actual best lap
        actual_best_time = None
        actual_best_driver = None
        
        for _, lap in laps.iterrows():
            if pd.notna(lap.get('LapTime')):
                lap_time = lap['LapTime'].total_seconds() if hasattr(lap['LapTime'], 'total_seconds') else 0
                if 60 < lap_time < 200:
                    if actual_best_time is None or lap_time < actual_best_time:
                        actual_best_time = lap_time
                        actual_best_driver = lap['Driver']
        
        # Calculate each driver's theoretical best
        driver_theoretical = []
        
        for driver in laps['Driver'].unique():
            driver_sectors = []
            for sector_name in ['Sector1Time', 'Sector2Time', 'Sector3Time']:
                if driver in best_sectors[sector_name]:
                    driver_sectors.append(best_sectors[sector_name][driver])
            
            if len(driver_sectors) == 3:
                driver_theoretical.append({
                    'driver': driver,
                    'color': driver_colors.get(driver, '#FFFFFF'),
                    'theoretical_time': round(sum(driver_sectors), 3),
                    'sector_times': [round(s, 3) for s in driver_sectors],
                    'delta_to_overall': round(sum(driver_sectors) - theoretical_time, 3)
                })
        
        driver_theoretical.sort(key=lambda x: x['theoretical_time'])
        
        return {
            "session_id": session_id,
            "theoretical_best_time": round(theoretical_time, 3),
            "actual_best_time": round(actual_best_time, 3) if actual_best_time else None,
            "actual_best_driver": actual_best_driver,
            "time_on_table": round(actual_best_time - theoretical_time, 3) if actual_best_time else None,
            "sector_components": theoretical_components,
            "driver_theoretical_bests": driver_theoretical
        }
        
    except Exception as e:
        logger.error(f"Error calculating theoretical best: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sector-consistency/{session_id}")
async def get_sector_consistency(session_id: str):
    """
    Analyze sector time consistency for each driver (box plot data).
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        results = session.results
        
        # Filter accurate laps
        if 'IsAccurate' in laps.columns:
            laps = laps[laps['IsAccurate'] == True]
        
        # Get driver colors
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        consistency_data = []
        
        for driver in laps['Driver'].unique():
            driver_laps = laps[laps['Driver'] == driver]
            
            driver_consistency = {
                'driver': driver,
                'color': driver_colors.get(driver, '#FFFFFF'),
                'sectors': {}
            }
            
            for sector_name in ['Sector1Time', 'Sector2Time', 'Sector3Time']:
                sector_times = []
                
                for _, lap in driver_laps.iterrows():
                    if pd.notna(lap.get(sector_name)):
                        time = lap[sector_name].total_seconds() if hasattr(lap[sector_name], 'total_seconds') else 0
                        if 5 < time < 60:  # Valid sector time range
                            sector_times.append(time)
                
                if len(sector_times) >= 3:
                    sector_times = np.array(sector_times)
                    q1, median, q3 = np.percentile(sector_times, [25, 50, 75])
                    
                    sector_num = int(sector_name.replace('Sector', '').replace('Time', ''))
                    
                    driver_consistency['sectors'][f'sector_{sector_num}'] = {
                        'min': round(float(sector_times.min()), 3),
                        'q1': round(float(q1), 3),
                        'median': round(float(median), 3),
                        'q3': round(float(q3), 3),
                        'max': round(float(sector_times.max()), 3),
                        'mean': round(float(sector_times.mean()), 3),
                        'std': round(float(sector_times.std()), 3),
                        'count': len(sector_times),
                        'all_times': [round(t, 3) for t in sector_times.tolist()]
                    }
            
            if driver_consistency['sectors']:
                consistency_data.append(driver_consistency)
        
        return {
            "session_id": session_id,
            "drivers": consistency_data
        }
        
    except Exception as e:
        logger.error(f"Error analyzing sector consistency: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/corner-analysis/{session_id}")
async def get_corner_analysis(
    session_id: str,
    corner_distance: float = Query(..., description="Distance (m) where corner apex is located"),
    window: float = Query(100, ge=50, le=300, description="Analysis window around corner in meters")
):
    """
    Analyze corner performance: entry speed, minimum speed, exit speed.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        results = session.results
        
        # Get driver colors
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        entry_dist = corner_distance - window / 2
        exit_dist = corner_distance + window / 2
        
        corner_data = []
        
        for driver in laps['Driver'].unique():
            try:
                driver_laps = laps.pick_drivers(driver)
                fastest = driver_laps.pick_fastest()
                
                if fastest is None:
                    continue
                
                tel = fastest.get_telemetry()
                
                if tel is None or len(tel) == 0:
                    continue
                
                # Find data in corner window
                mask = (tel['Distance'] >= entry_dist) & (tel['Distance'] <= exit_dist)
                corner_tel = tel[mask]
                
                if len(corner_tel) < 5:
                    continue
                
                speeds = corner_tel['Speed'].values
                distances = corner_tel['Distance'].values
                
                # Entry speed (first 20% of window)
                entry_mask = distances <= entry_dist + window * 0.2
                entry_speed = float(speeds[entry_mask].mean()) if entry_mask.any() else 0
                
                # Minimum speed (apex)
                min_speed = float(speeds.min())
                apex_idx = np.argmin(speeds)
                apex_distance = float(distances[apex_idx])
                
                # Exit speed (last 20% of window)
                exit_mask = distances >= exit_dist - window * 0.2
                exit_speed = float(speeds[exit_mask].mean()) if exit_mask.any() else 0
                
                corner_data.append({
                    'driver': driver,
                    'color': driver_colors.get(driver, '#FFFFFF'),
                    'entry_speed': round(entry_speed, 1),
                    'min_speed': round(min_speed, 1),
                    'exit_speed': round(exit_speed, 1),
                    'apex_distance': round(apex_distance, 1),
                    'speed_loss': round(entry_speed - min_speed, 1),
                    'speed_gain': round(exit_speed - min_speed, 1)
                })
                
            except Exception as e:
                logger.warning(f"Could not analyze corner for {driver}: {e}")
                continue
        
        if not corner_data:
            return {"session_id": session_id, "message": "No corner data available", "analysis": []}
        
        # Sort by minimum speed (higher is better through corner)
        corner_data.sort(key=lambda x: -x['min_speed'])
        
        # Add rankings
        for i, d in enumerate(corner_data):
            d['rank'] = i + 1
            d['delta_to_best'] = round(corner_data[0]['min_speed'] - d['min_speed'], 1)
        
        return {
            "session_id": session_id,
            "corner_distance": corner_distance,
            "entry_distance": entry_dist,
            "exit_distance": exit_dist,
            "window_size": window,
            "analysis": corner_data
        }
        
    except Exception as e:
        logger.error(f"Error analyzing corner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/speed-trace/{session_id}")
async def get_speed_trace_comparison(
    session_id: str,
    drivers: str = Query(..., description="Comma-separated driver abbreviations"),
    start_dist: Optional[float] = Query(None, description="Start distance (m)"),
    end_dist: Optional[float] = Query(None, description="End distance (m)")
):
    """
    Get speed traces for multiple drivers for overlay comparison.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        results = session.results
        
        # Get driver colors
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        driver_list = [d.strip() for d in drivers.split(',')]
        
        speed_traces = []
        
        for driver in driver_list:
            try:
                driver_laps = laps.pick_drivers(driver)
                fastest = driver_laps.pick_fastest()
                
                if fastest is None:
                    continue
                
                tel = fastest.get_telemetry()
                
                if tel is None or len(tel) == 0:
                    continue
                
                # Apply distance filter if specified
                if start_dist is not None:
                    tel = tel[tel['Distance'] >= start_dist]
                if end_dist is not None:
                    tel = tel[tel['Distance'] <= end_dist]
                
                # Downsample for performance (every 10th point)
                tel = tel.iloc[::10]
                
                trace_data = []
                for _, row in tel.iterrows():
                    trace_data.append({
                        'distance': round(float(row['Distance']), 1),
                        'speed': round(float(row['Speed']), 1)
                    })
                
                speed_traces.append({
                    'driver': driver,
                    'color': driver_colors.get(driver, '#FFFFFF'),
                    'lap_time': round(fastest['LapTime'].total_seconds(), 3) if pd.notna(fastest.get('LapTime')) else None,
                    'data_points': len(trace_data),
                    'trace': trace_data
                })
                
            except Exception as e:
                logger.warning(f"Could not get speed trace for {driver}: {e}")
                continue
        
        return {
            "session_id": session_id,
            "drivers": driver_list,
            "start_distance": start_dist,
            "end_distance": end_dist,
            "speed_traces": speed_traces
        }
        
    except Exception as e:
        logger.error(f"Error getting speed traces: {e}")
        raise HTTPException(status_code=500, detail=str(e))
