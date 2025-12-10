"""
Core Data Module for Apex Analyst
Handles FastF1 data loading and caching
"""

import fastf1
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any
import streamlit as st

# Import configuration
import sys
sys.path.append(str(Path(__file__).parent.parent))
from config.settings import FASTF1_CACHE_DIR, CURRENT_SEASON, AVAILABLE_SEASONS


def setup_fastf1_cache():
    """Initialize FastF1 cache directory"""
    fastf1.Cache.enable_cache(str(FASTF1_CACHE_DIR))


@st.cache_data(ttl=3600)
def get_event_schedule(year: int) -> pd.DataFrame:
    """Get the event schedule for a given year"""
    setup_fastf1_cache()
    schedule = fastf1.get_event_schedule(year)
    return schedule


@st.cache_data(ttl=3600)
def get_event_list(year: int) -> List[str]:
    """Get list of event names for a given year"""
    schedule = get_event_schedule(year)
    return schedule['EventName'].tolist()


@st.cache_resource
def load_session(_year: int, _event: str, _session_type: str) -> fastf1.core.Session:
    """
    Load and cache a FastF1 session
    Uses _prefix to prevent Streamlit from hashing these parameters
    """
    setup_fastf1_cache()
    session = fastf1.get_session(_year, _event, _session_type)
    session.load()
    return session


def get_session_drivers(session: fastf1.core.Session) -> List[str]:
    """Get list of driver abbreviations from a session"""
    return list(session.drivers)


def get_driver_info(session: fastf1.core.Session) -> pd.DataFrame:
    """Get driver information including full names and teams"""
    drivers_df = session.results[['Abbreviation', 'FullName', 'TeamName', 'TeamColor']].copy()
    return drivers_df


def get_laps_data(session: fastf1.core.Session, driver: Optional[str] = None) -> pd.DataFrame:
    """
    Get lap data for a session, optionally filtered by driver
    
    Parameters:
    -----------
    session : fastf1.core.Session
        Loaded FastF1 session
    driver : str, optional
        Driver abbreviation to filter by
        
    Returns:
    --------
    pd.DataFrame
        Lap data with timing and telemetry info
    """
    laps = session.laps
    if driver:
        laps = laps.pick_driver(driver)
    return laps


def get_telemetry_data(lap: pd.Series) -> pd.DataFrame:
    """
    Get telemetry data for a specific lap
    
    Parameters:
    -----------
    lap : pd.Series
        A single lap from session.laps
        
    Returns:
    --------
    pd.DataFrame
        Telemetry data including speed, throttle, brake, steering
    """
    return lap.get_telemetry()


def get_car_data(lap: pd.Series) -> pd.DataFrame:
    """Get car data for a specific lap"""
    return lap.get_car_data()


def get_pos_data(lap: pd.Series) -> pd.DataFrame:
    """Get position data for a specific lap"""
    return lap.get_pos_data()


def get_weather_data(session: fastf1.core.Session) -> pd.DataFrame:
    """Get weather data for a session"""
    return session.weather_data


def get_fastest_laps(session: fastf1.core.Session, n: int = 10) -> pd.DataFrame:
    """Get the n fastest laps of the session"""
    laps = session.laps.pick_quicklaps()
    return laps.nsmallest(n, 'LapTime')


def get_stint_data(laps: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate stint information from lap data
    
    Parameters:
    -----------
    laps : pd.DataFrame
        Lap data for a driver
        
    Returns:
    --------
    pd.DataFrame
        Stint summary with compound, length, and average pace
    """
    stints = laps.groupby(['Stint', 'Compound']).agg({
        'LapNumber': ['min', 'max', 'count'],
        'LapTime': ['mean', 'min']
    }).reset_index()
    
    stints.columns = ['Stint', 'Compound', 'StartLap', 'EndLap', 'StintLength', 'AvgLapTime', 'BestLapTime']
    return stints


def calculate_sector_times(laps: pd.DataFrame) -> Dict[str, pd.Timedelta]:
    """
    Calculate best sector times from lap data
    
    Parameters:
    -----------
    laps : pd.DataFrame
        Lap data with sector times
        
    Returns:
    --------
    dict
        Dictionary with best S1, S2, S3 times
    """
    return {
        'S1': laps['Sector1Time'].min(),
        'S2': laps['Sector2Time'].min(),
        'S3': laps['Sector3Time'].min()
    }


def calculate_theoretical_best(laps: pd.DataFrame) -> pd.Timedelta:
    """
    Calculate theoretical best lap time from best sectors
    
    Parameters:
    -----------
    laps : pd.DataFrame
        Lap data with sector times
        
    Returns:
    --------
    pd.Timedelta
        Theoretical best lap time
    """
    sectors = calculate_sector_times(laps)
    return sectors['S1'] + sectors['S2'] + sectors['S3']


def filter_telemetry_by_distance(telemetry: pd.DataFrame, 
                                   start_dist: float, 
                                   end_dist: float) -> pd.DataFrame:
    """
    Filter telemetry data by distance range
    
    Parameters:
    -----------
    telemetry : pd.DataFrame
        Telemetry data with 'Distance' column
    start_dist : float
        Start distance in meters
    end_dist : float
        End distance in meters
        
    Returns:
    --------
    pd.DataFrame
        Filtered telemetry data
    """
    mask = (telemetry['Distance'] >= start_dist) & (telemetry['Distance'] <= end_dist)
    return telemetry[mask].copy()


def get_circuit_info(session: fastf1.core.Session) -> Dict[str, Any]:
    """
    Get circuit information from session
    
    Returns:
    --------
    dict
        Circuit name, length, and corner information if available
    """
    event = session.event
    return {
        'name': event['EventName'],
        'location': event['Location'],
        'country': event['Country'],
        'circuit_name': event.get('OfficialEventName', event['EventName'])
    }


def get_driver_color(session: fastf1.core.Session, driver: str) -> str:
    """Get the team color for a driver"""
    try:
        return '#' + session.get_driver(driver)['TeamColor']
    except:
        return '#FFFFFF'


def calculate_tire_degradation(laps: pd.DataFrame, compound: str) -> Tuple[float, float]:
    """
    Calculate tire degradation rate for a specific compound
    
    Parameters:
    -----------
    laps : pd.DataFrame
        Lap data for a driver
    compound : str
        Tire compound to analyze
        
    Returns:
    --------
    tuple
        (degradation_rate in s/lap, r_squared fit quality)
    """
    from scipy import stats
    
    compound_laps = laps[laps['Compound'] == compound].copy()
    compound_laps = compound_laps[compound_laps['IsAccurate'] == True]
    
    if len(compound_laps) < 3:
        return np.nan, np.nan
    
    # Convert lap times to seconds
    lap_times = compound_laps['LapTime'].dt.total_seconds()
    lap_numbers = compound_laps['LapNumber'].values
    
    # Fit linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(lap_numbers, lap_times)
    
    return slope, r_value ** 2


def get_all_driver_abbreviations(session: fastf1.core.Session) -> List[str]:
    """Get all driver abbreviations for a session"""
    return session.results['Abbreviation'].tolist()
