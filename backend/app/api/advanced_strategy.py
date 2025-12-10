"""
Advanced Strategy API Router
Handles tyre degradation, pit windows, what-if simulations, and position tracking
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging
import pandas as pd
import numpy as np
from scipy import stats

from app.services.session_service import session_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Advanced Strategy"])


@router.get("/tyre-degradation/{session_id}")
async def get_tyre_degradation(
    session_id: str,
    drivers: Optional[str] = Query(None, description="Comma-separated driver abbreviations (optional)")
):
    """
    Calculate tyre degradation curves for each compound.
    Returns lap time vs tyre age data for degradation analysis.
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
        
        # Filter drivers if specified
        if drivers:
            driver_list = [d.strip() for d in drivers.split(',')]
            laps = laps[laps['Driver'].isin(driver_list)]
        
        # Get driver colors
        driver_colors = {}
        for _, row in results.iterrows():
            driver_colors[row['Abbreviation']] = f"#{row.get('TeamColor', 'FFFFFF')}"
        
        # Compound colors
        compound_colors = {
            'SOFT': '#FF3333',
            'MEDIUM': '#FFD700',
            'HARD': '#FFFFFF',
            'INTERMEDIATE': '#39B54A',
            'WET': '#00BFFF'
        }
        
        degradation_data = {}
        
        # Group by compound
        compounds = laps['Compound'].dropna().unique()
        
        for compound in compounds:
            compound_laps = laps[laps['Compound'] == compound].copy()
            compound_laps = compound_laps[compound_laps['IsAccurate'] == True] if 'IsAccurate' in compound_laps.columns else compound_laps
            
            if len(compound_laps) < 5:
                continue
            
            # Calculate tyre age for each lap
            stint_data = []
            
            for driver in compound_laps['Driver'].unique():
                driver_compound_laps = compound_laps[compound_laps['Driver'] == driver].copy()
                
                # Identify stints (gaps in lap numbers indicate pit stops)
                driver_compound_laps = driver_compound_laps.sort_values('LapNumber')
                
                stint_start = None
                tyre_age = 0
                
                for idx, lap in driver_compound_laps.iterrows():
                    if stint_start is None or lap['LapNumber'] - stint_start > 1:
                        tyre_age = 1
                        stint_start = lap['LapNumber']
                    else:
                        tyre_age += 1
                    
                    if pd.notna(lap['LapTime']):
                        lap_time_seconds = lap['LapTime'].total_seconds()
                        # Filter out pit laps and outliers
                        if 60 < lap_time_seconds < 200:  # Reasonable lap time range
                            stint_data.append({
                                'driver': driver,
                                'tyre_age': tyre_age,
                                'lap_time': lap_time_seconds,
                                'lap_number': int(lap['LapNumber'])
                            })
                    
                    stint_start = lap['LapNumber']
            
            if len(stint_data) < 5:
                continue
            
            # Calculate degradation rate using linear regression
            df = pd.DataFrame(stint_data)
            
            # Group by tyre age and calculate median lap time
            age_groups = df.groupby('tyre_age')['lap_time'].agg(['median', 'mean', 'std', 'count']).reset_index()
            age_groups = age_groups[age_groups['count'] >= 2]  # Need at least 2 samples
            
            if len(age_groups) >= 3:
                # Linear regression for degradation rate
                slope, intercept, r_value, p_value, std_err = stats.linregress(
                    age_groups['tyre_age'], 
                    age_groups['median']
                )
                
                degradation_data[compound] = {
                    'compound': compound,
                    'color': compound_colors.get(compound, '#FFFFFF'),
                    'degradation_rate': round(slope, 4),  # seconds per lap
                    'base_pace': round(intercept, 3),
                    'r_squared': round(r_value ** 2, 4),
                    'data_points': [
                        {
                            'tyre_age': int(row['tyre_age']),
                            'median_time': round(row['median'], 3),
                            'mean_time': round(row['mean'], 3),
                            'std_dev': round(row['std'], 3) if pd.notna(row['std']) else 0,
                            'sample_count': int(row['count'])
                        }
                        for _, row in age_groups.iterrows()
                    ],
                    'raw_data': stint_data[:500]  # Limit for performance
                }
        
        return {
            "session_id": session_id,
            "compounds": list(degradation_data.keys()),
            "degradation_curves": degradation_data,
            "compound_colors": compound_colors
        }
        
    except Exception as e:
        logger.error(f"Error calculating tyre degradation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pit-window/{session_id}")
async def get_pit_window_analysis(
    session_id: str,
    driver: str = Query(..., description="Driver abbreviation"),
    pit_time_loss: float = Query(22.0, ge=18, le=30, description="Pit stop time loss in seconds")
):
    """
    Calculate optimal pit windows based on tyre degradation and undercut/overcut analysis.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found."
            )
        
        laps = session.laps
        driver_laps = laps.pick_drivers(driver)
        
        if len(driver_laps) == 0:
            raise HTTPException(status_code=404, detail=f"No data for driver {driver}")
        
        # Calculate cumulative time loss from degradation
        pit_windows = []
        
        # Analyze each stint
        driver_laps = driver_laps.sort_values('LapNumber')
        
        # Track current stint
        current_stint_start = None
        current_compound = None
        cumulative_deg_loss = 0
        base_lap_time = None
        
        for idx, lap in driver_laps.iterrows():
            compound = lap.get('Compound')
            lap_num = int(lap['LapNumber'])
            
            # Detect stint change
            if current_compound != compound or current_stint_start is None:
                current_stint_start = lap_num
                current_compound = compound
                cumulative_deg_loss = 0
                
                # Set base lap time from first few laps of stint
                if pd.notna(lap['LapTime']):
                    base_lap_time = lap['LapTime'].total_seconds()
            
            if pd.notna(lap['LapTime']) and base_lap_time:
                current_time = lap['LapTime'].total_seconds()
                deg_this_lap = max(0, current_time - base_lap_time)
                cumulative_deg_loss += deg_this_lap
                
                tyre_age = lap_num - current_stint_start + 1
                
                # Calculate if pit would be beneficial
                # Pit is beneficial when cumulative degradation > pit time loss
                pit_beneficial = cumulative_deg_loss > pit_time_loss
                
                pit_windows.append({
                    'lap': lap_num,
                    'tyre_age': tyre_age,
                    'compound': compound,
                    'cumulative_deg_loss': round(cumulative_deg_loss, 3),
                    'pit_time_loss': pit_time_loss,
                    'pit_beneficial': pit_beneficial,
                    'net_time': round(cumulative_deg_loss - pit_time_loss, 3)
                })
        
        # Calculate undercut window (3-4 laps before optimal pit)
        optimal_pit_lap = None
        for window in pit_windows:
            if window['pit_beneficial']:
                optimal_pit_lap = window['lap']
                break
        
        undercut_window = None
        overcut_window = None
        
        if optimal_pit_lap:
            undercut_window = {
                'start': max(1, optimal_pit_lap - 4),
                'end': optimal_pit_lap - 1,
                'recommendation': 'Pit early to gain track position'
            }
            overcut_window = {
                'start': optimal_pit_lap + 1,
                'end': min(optimal_pit_lap + 5, len(pit_windows)),
                'recommendation': 'Stay out on clear track for free air'
            }
        
        return {
            "session_id": session_id,
            "driver": driver,
            "pit_time_loss": pit_time_loss,
            "optimal_pit_lap": optimal_pit_lap,
            "undercut_window": undercut_window,
            "overcut_window": overcut_window,
            "lap_analysis": pit_windows
        }
        
    except Exception as e:
        logger.error(f"Error calculating pit window: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/position-changes/{session_id}")
async def get_position_changes(session_id: str):
    """
    Track position changes throughout the race for all drivers.
    Shows position gains/losses per stint.
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
        
        position_data = []
        drivers = laps['Driver'].unique()
        
        for driver in drivers:
            driver_laps = laps.pick_drivers(driver).sort_values('LapNumber')
            
            positions = []
            for _, lap in driver_laps.iterrows():
                if pd.notna(lap.get('Position')):
                    positions.append({
                        'lap': int(lap['LapNumber']),
                        'position': int(lap['Position'])
                    })
            
            if positions:
                start_pos = positions[0]['position'] if positions else 0
                end_pos = positions[-1]['position'] if positions else 0
                
                position_data.append({
                    'driver': driver,
                    'color': driver_colors.get(driver, '#FFFFFF'),
                    'start_position': start_pos,
                    'end_position': end_pos,
                    'positions_gained': start_pos - end_pos,
                    'positions': positions
                })
        
        # Sort by final position
        position_data.sort(key=lambda x: x['end_position'])
        
        return {
            "session_id": session_id,
            "total_laps": int(laps['LapNumber'].max()),
            "drivers": position_data
        }
        
    except Exception as e:
        logger.error(f"Error getting position changes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fuel-effect/{session_id}")
async def get_fuel_effect(
    session_id: str,
    fuel_kg_per_lap: float = Query(1.5, ge=1.0, le=2.5, description="Fuel consumption per lap in kg"),
    time_per_kg: float = Query(0.03, ge=0.02, le=0.05, description="Lap time improvement per kg burned")
):
    """
    Calculate estimated fuel load effect on lap times.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        total_laps = int(laps['LapNumber'].max())
        
        # Estimate starting fuel (total laps * fuel per lap + margin)
        estimated_start_fuel = total_laps * fuel_kg_per_lap + 5  # 5kg margin
        
        fuel_effect_data = []
        
        for lap_num in range(1, total_laps + 1):
            fuel_remaining = estimated_start_fuel - (lap_num * fuel_kg_per_lap)
            fuel_burned = lap_num * fuel_kg_per_lap
            time_gained = fuel_burned * time_per_kg
            
            fuel_effect_data.append({
                'lap': lap_num,
                'fuel_remaining': round(max(0, fuel_remaining), 2),
                'fuel_burned': round(fuel_burned, 2),
                'cumulative_time_gained': round(time_gained, 3),
                'time_per_lap_faster': round(time_per_kg * fuel_kg_per_lap, 4)
            })
        
        return {
            "session_id": session_id,
            "total_laps": total_laps,
            "estimated_start_fuel_kg": round(estimated_start_fuel, 2),
            "fuel_consumption_per_lap_kg": fuel_kg_per_lap,
            "time_improvement_per_kg": time_per_kg,
            "total_fuel_effect_seconds": round(total_laps * fuel_kg_per_lap * time_per_kg, 3),
            "fuel_effect": fuel_effect_data
        }
        
    except Exception as e:
        logger.error(f"Error calculating fuel effect: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/safety-car-probability/{session_id}")
async def get_safety_car_probability(session_id: str):
    """
    Analyze safety car/VSC events and provide historical probability data.
    """
    try:
        session = session_manager.get_session_by_id(session_id)
        
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
        laps = session.laps
        
        # Detect SC/VSC from track status if available
        sc_laps = []
        vsc_laps = []
        
        if 'TrackStatus' in laps.columns:
            for _, lap in laps.iterrows():
                status = lap.get('TrackStatus', '')
                if '4' in str(status):  # SC
                    sc_laps.append(int(lap['LapNumber']))
                elif '6' in str(status):  # VSC
                    vsc_laps.append(int(lap['LapNumber']))
        
        # Historical SC probability by circuit (simplified - could be extended with actual data)
        circuit_name = session.event.get('EventName', '') if hasattr(session, 'event') else ''
        
        # Average historical probabilities (these would ideally come from a database)
        historical_probability = {
            'Monaco': 0.75,
            'Singapore': 0.70,
            'Baku': 0.65,
            'Jeddah': 0.60,
            'Melbourne': 0.55,
            'default': 0.45
        }
        
        prob = 0.45  # Default
        for circuit, p in historical_probability.items():
            if circuit.lower() in circuit_name.lower():
                prob = p
                break
        
        total_laps = int(laps['LapNumber'].max())
        
        return {
            "session_id": session_id,
            "circuit": circuit_name,
            "total_laps": total_laps,
            "sc_laps": list(set(sc_laps)),
            "vsc_laps": list(set(vsc_laps)),
            "sc_count": len(set(sc_laps)) // 3 if sc_laps else 0,  # Approximate SC periods
            "vsc_count": len(set(vsc_laps)) // 2 if vsc_laps else 0,
            "historical_sc_probability": prob,
            "strategy_recommendation": (
                "Consider aggressive strategy with early pit" if prob > 0.5 
                else "Standard strategy recommended - lower SC probability"
            )
        }
        
    except Exception as e:
        logger.error(f"Error analyzing safety car: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drs-trains/{session_id}")
async def get_drs_trains(session_id: str):
    """
    Detect DRS trains (cars stuck within 1 second of each other).
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
        
        total_laps = int(laps['LapNumber'].max())
        drs_train_data = []
        
        for lap_num in range(1, total_laps + 1):
            lap_data = laps[laps['LapNumber'] == lap_num].copy()
            
            if len(lap_data) < 2:
                continue
            
            # Sort by position
            lap_data = lap_data.sort_values('Position')
            
            # Detect cars within 1 second (DRS range)
            trains = []
            current_train = []
            
            prev_time = None
            for _, row in lap_data.iterrows():
                if pd.notna(row.get('Time')):
                    current_time = row['Time'].total_seconds() if hasattr(row['Time'], 'total_seconds') else 0
                    
                    if prev_time is not None:
                        gap = current_time - prev_time
                        
                        if gap <= 1.0:  # Within DRS range
                            if not current_train:
                                current_train.append(lap_data.iloc[lap_data.index.get_loc(row.name) - 1]['Driver'])
                            current_train.append(row['Driver'])
                        else:
                            if len(current_train) >= 3:  # Train of 3+ cars
                                trains.append(current_train)
                            current_train = []
                    
                    prev_time = current_time
            
            if len(current_train) >= 3:
                trains.append(current_train)
            
            if trains:
                drs_train_data.append({
                    'lap': lap_num,
                    'trains': trains
                })
        
        # Summarize drivers most affected
        driver_train_laps = {}
        for lap_data in drs_train_data:
            for train in lap_data['trains']:
                for driver in train[1:]:  # Exclude leader of train
                    driver_train_laps[driver] = driver_train_laps.get(driver, 0) + 1
        
        affected_drivers = [
            {
                'driver': driver,
                'color': driver_colors.get(driver, '#FFFFFF'),
                'laps_in_train': count,
                'percentage': round(count / total_laps * 100, 1)
            }
            for driver, count in sorted(driver_train_laps.items(), key=lambda x: -x[1])
        ]
        
        return {
            "session_id": session_id,
            "total_laps": total_laps,
            "train_events": drs_train_data,
            "affected_drivers": affected_drivers,
            "total_train_laps": len(drs_train_data)
        }
        
    except Exception as e:
        logger.error(f"Error detecting DRS trains: {e}")
        raise HTTPException(status_code=500, detail=str(e))
