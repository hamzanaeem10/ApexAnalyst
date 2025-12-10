"""
Jolpica F1 API Client for Historical Data
Compatible with Ergast API format for historical race data
"""

import requests
import pandas as pd
from typing import Optional, List, Dict, Any
from datetime import datetime
import streamlit as st


BASE_URL = "https://api.jolpi.ca/ergast/f1"


class JolpicaF1Client:
    """Client for the Jolpica F1 API (Ergast-compatible)"""
    
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make a request to the API"""
        url = f"{self.base_url}/{endpoint}.json"
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            st.error(f"API request failed: {e}")
            return {}
    
    @st.cache_data(ttl=86400)
    def get_seasons(_self) -> List[int]:
        """Get list of available seasons"""
        data = _self._make_request("seasons", {"limit": 100})
        if 'MRData' in data:
            seasons = data['MRData']['SeasonTable']['Seasons']
            return [int(s['season']) for s in seasons]
        return list(range(1950, datetime.now().year + 1))
    
    @st.cache_data(ttl=86400)
    def get_races(_self, season: int) -> pd.DataFrame:
        """Get all races for a season"""
        data = _self._make_request(f"{season}")
        if 'MRData' in data:
            races = data['MRData']['RaceTable']['Races']
            return pd.DataFrame(races)
        return pd.DataFrame()
    
    @st.cache_data(ttl=86400)
    def get_race_results(_self, season: int, race_round: int) -> pd.DataFrame:
        """Get race results for a specific race"""
        data = _self._make_request(f"{season}/{race_round}/results")
        if 'MRData' in data and data['MRData']['RaceTable']['Races']:
            results = data['MRData']['RaceTable']['Races'][0]['Results']
            return pd.DataFrame(results)
        return pd.DataFrame()
    
    @st.cache_data(ttl=86400)
    def get_lap_times(_self, season: int, race_round: int) -> pd.DataFrame:
        """Get all lap times for a race"""
        all_laps = []
        lap_num = 1
        
        while True:
            data = _self._make_request(f"{season}/{race_round}/laps/{lap_num}")
            if 'MRData' in data and data['MRData']['RaceTable']['Races']:
                race_data = data['MRData']['RaceTable']['Races'][0]
                if 'Laps' in race_data and race_data['Laps']:
                    lap_data = race_data['Laps'][0]
                    for timing in lap_data['Timings']:
                        all_laps.append({
                            'lap': int(lap_data['number']),
                            'driverId': timing['driverId'],
                            'position': int(timing['position']),
                            'time': timing['time']
                        })
                    lap_num += 1
                else:
                    break
            else:
                break
            
            if lap_num > 100:  # Safety limit
                break
        
        return pd.DataFrame(all_laps)
    
    @st.cache_data(ttl=86400)
    def get_pit_stops(_self, season: int, race_round: int) -> pd.DataFrame:
        """Get pit stop data for a race"""
        data = _self._make_request(f"{season}/{race_round}/pitstops")
        if 'MRData' in data and data['MRData']['RaceTable']['Races']:
            pit_stops = data['MRData']['RaceTable']['Races'][0].get('PitStops', [])
            return pd.DataFrame(pit_stops)
        return pd.DataFrame()
    
    @st.cache_data(ttl=86400)
    def get_driver_standings(_self, season: int, race_round: Optional[int] = None) -> pd.DataFrame:
        """Get driver standings"""
        endpoint = f"{season}/driverStandings" if not race_round else f"{season}/{race_round}/driverStandings"
        data = _self._make_request(endpoint)
        if 'MRData' in data:
            standings = data['MRData']['StandingsTable']['StandingsLists']
            if standings:
                return pd.DataFrame(standings[0]['DriverStandings'])
        return pd.DataFrame()
    
    @st.cache_data(ttl=86400)
    def get_constructor_standings(_self, season: int, race_round: Optional[int] = None) -> pd.DataFrame:
        """Get constructor standings"""
        endpoint = f"{season}/constructorStandings" if not race_round else f"{season}/{race_round}/constructorStandings"
        data = _self._make_request(endpoint)
        if 'MRData' in data:
            standings = data['MRData']['StandingsTable']['StandingsLists']
            if standings:
                return pd.DataFrame(standings[0]['ConstructorStandings'])
        return pd.DataFrame()
    
    @st.cache_data(ttl=86400)
    def get_qualifying_results(_self, season: int, race_round: int) -> pd.DataFrame:
        """Get qualifying results for a specific race"""
        data = _self._make_request(f"{season}/{race_round}/qualifying")
        if 'MRData' in data and data['MRData']['RaceTable']['Races']:
            results = data['MRData']['RaceTable']['Races'][0].get('QualifyingResults', [])
            return pd.DataFrame(results)
        return pd.DataFrame()
    
    @st.cache_data(ttl=86400)
    def get_drivers(_self, season: int) -> pd.DataFrame:
        """Get all drivers for a season"""
        data = _self._make_request(f"{season}/drivers")
        if 'MRData' in data:
            drivers = data['MRData']['DriverTable']['Drivers']
            return pd.DataFrame(drivers)
        return pd.DataFrame()
    
    @st.cache_data(ttl=86400)
    def get_constructors(_self, season: int) -> pd.DataFrame:
        """Get all constructors for a season"""
        data = _self._make_request(f"{season}/constructors")
        if 'MRData' in data:
            constructors = data['MRData']['ConstructorTable']['Constructors']
            return pd.DataFrame(constructors)
        return pd.DataFrame()


def parse_lap_time(time_str: str) -> float:
    """
    Convert lap time string to seconds
    
    Parameters:
    -----------
    time_str : str
        Lap time in format "M:SS.mmm" or "SS.mmm"
        
    Returns:
    --------
    float
        Lap time in seconds
    """
    try:
        if ':' in time_str:
            parts = time_str.split(':')
            minutes = int(parts[0])
            seconds = float(parts[1])
            return minutes * 60 + seconds
        else:
            return float(time_str)
    except:
        return float('nan')


def analyze_race_strategies(lap_times_df: pd.DataFrame, 
                           pit_stops_df: pd.DataFrame,
                           results_df: pd.DataFrame) -> pd.DataFrame:
    """
    Analyze race strategies from lap and pit stop data
    
    Parameters:
    -----------
    lap_times_df : pd.DataFrame
        Lap times data
    pit_stops_df : pd.DataFrame
        Pit stop data
    results_df : pd.DataFrame
        Race results
        
    Returns:
    --------
    pd.DataFrame
        Strategy analysis for each driver
    """
    if lap_times_df.empty or results_df.empty:
        return pd.DataFrame()
    
    strategies = []
    
    for driver_id in lap_times_df['driverId'].unique():
        driver_laps = lap_times_df[lap_times_df['driverId'] == driver_id].copy()
        driver_pits = pit_stops_df[pit_stops_df['driverId'] == driver_id] if not pit_stops_df.empty else pd.DataFrame()
        
        # Convert lap times to seconds
        driver_laps['time_seconds'] = driver_laps['time'].apply(parse_lap_time)
        
        # Calculate statistics
        num_stops = len(driver_pits)
        avg_lap_time = driver_laps['time_seconds'].mean()
        best_lap_time = driver_laps['time_seconds'].min()
        total_laps = len(driver_laps)
        
        # Get pit stop laps
        pit_laps = driver_pits['lap'].tolist() if not driver_pits.empty else []
        
        strategies.append({
            'driverId': driver_id,
            'numStops': num_stops,
            'avgLapTime': avg_lap_time,
            'bestLapTime': best_lap_time,
            'totalLaps': total_laps,
            'pitStopLaps': pit_laps,
            'strategyType': f"{num_stops}-stop"
        })
    
    return pd.DataFrame(strategies)


def calculate_strategy_efficiency(strategy_df: pd.DataFrame, 
                                  pit_stop_time_loss: float = 22.0) -> pd.DataFrame:
    """
    Calculate strategy efficiency metrics
    
    Parameters:
    -----------
    strategy_df : pd.DataFrame
        Strategy analysis data
    pit_stop_time_loss : float
        Average time lost per pit stop (seconds)
        
    Returns:
    --------
    pd.DataFrame
        Strategy efficiency analysis
    """
    if strategy_df.empty:
        return pd.DataFrame()
    
    df = strategy_df.copy()
    df['totalPitTimeLoss'] = df['numStops'] * pit_stop_time_loss
    df['estimatedRaceTime'] = df['avgLapTime'] * df['totalLaps'] + df['totalPitTimeLoss']
    
    # Calculate delta to best strategy
    best_time = df['estimatedRaceTime'].min()
    df['deltaToOptimal'] = df['estimatedRaceTime'] - best_time
    
    return df.sort_values('estimatedRaceTime')


# Create singleton client instance
_client = None

def get_client() -> JolpicaF1Client:
    """Get or create the API client singleton"""
    global _client
    if _client is None:
        _client = JolpicaF1Client()
    return _client
