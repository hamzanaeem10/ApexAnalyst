"""
Historical Strategy Service
Handles historical race strategy analysis using Jolpica F1 API
"""

import requests
import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any
import logging

from app.models.schemas import (
    StrategyEntry, StrategyEfficiency, PitStopData,
    HistoricalStrategyResponse
)

logger = logging.getLogger(__name__)

BASE_URL = "https://api.jolpi.ca/ergast/f1"


class HistoricalStrategyService:
    """Service for historical race strategy analysis"""
    
    def __init__(self):
        self.session = requests.Session()
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make a request to the Jolpica API"""
        url = f"{BASE_URL}/{endpoint}.json"
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"API request failed: {e}")
            return {}
    
    def get_races(self, year: int) -> List[Dict]:
        """Get all races for a season"""
        data = self._make_request(str(year))
        if 'MRData' in data:
            return data['MRData']['RaceTable']['Races']
        return []
    
    def get_race_results(self, year: int, race_round: int) -> pd.DataFrame:
        """Get race results"""
        data = self._make_request(f"{year}/{race_round}/results")
        if 'MRData' in data and data['MRData']['RaceTable']['Races']:
            results = data['MRData']['RaceTable']['Races'][0]['Results']
            return pd.DataFrame(results)
        return pd.DataFrame()
    
    def get_lap_times(self, year: int, race_round: int) -> pd.DataFrame:
        """Get all lap times for a race"""
        all_laps = []
        lap_num = 1
        
        while lap_num <= 100:  # Safety limit
            data = self._make_request(f"{year}/{race_round}/laps/{lap_num}")
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
        
        return pd.DataFrame(all_laps)
    
    def get_pit_stops(self, year: int, race_round: int) -> pd.DataFrame:
        """Get pit stop data"""
        data = self._make_request(f"{year}/{race_round}/pitstops")
        if 'MRData' in data and data['MRData']['RaceTable']['Races']:
            pit_stops = data['MRData']['RaceTable']['Races'][0].get('PitStops', [])
            return pd.DataFrame(pit_stops)
        return pd.DataFrame()
    
    @staticmethod
    def parse_lap_time(time_str: str) -> float:
        """Convert lap time string to seconds"""
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
    
    def analyze_strategies(
        self,
        year: int,
        race_round: int,
        strategy_filter: List[str],
        pit_time_loss: float = 22.0
    ) -> HistoricalStrategyResponse:
        """Complete strategy analysis for a historical race"""
        
        # Fetch data
        races = self.get_races(year)
        if not races or race_round > len(races):
            raise ValueError(f"Race round {race_round} not found for {year}")
        
        race_info = races[race_round - 1]
        race_name = race_info['raceName']
        
        results_df = self.get_race_results(year, race_round)
        lap_times_df = self.get_lap_times(year, race_round)
        pit_stops_df = self.get_pit_stops(year, race_round)
        
        if results_df.empty:
            raise ValueError("No race results available")
        
        # Build driver mapping
        driver_names = {}
        driver_positions = {}
        driver_teams = {}
        
        for _, row in results_df.iterrows():
            driver_id = row['Driver']['driverId']
            driver_names[driver_id] = f"{row['Driver']['givenName']} {row['Driver']['familyName']}"
            driver_positions[driver_id] = int(row['position'])
            driver_teams[driver_id] = row['Constructor']['name']
        
        # Analyze each driver's strategy
        strategies = []
        
        for driver_id in lap_times_df['driverId'].unique() if not lap_times_df.empty else []:
            driver_laps = lap_times_df[lap_times_df['driverId'] == driver_id].copy()
            driver_pits = pit_stops_df[pit_stops_df['driverId'] == driver_id] if not pit_stops_df.empty else pd.DataFrame()
            
            # Convert lap times
            driver_laps['time_seconds'] = driver_laps['time'].apply(self.parse_lap_time)
            
            num_stops = len(driver_pits)
            avg_lap_time = driver_laps['time_seconds'].mean()
            best_lap_time = driver_laps['time_seconds'].min()
            total_laps = len(driver_laps)
            pit_laps = driver_pits['lap'].astype(int).tolist() if not driver_pits.empty else []
            
            strategies.append(StrategyEntry(
                driver_id=driver_id,
                driver_name=driver_names.get(driver_id, driver_id),
                position=driver_positions.get(driver_id, 99),
                team=driver_teams.get(driver_id, "Unknown"),
                strategy_type=f"{num_stops}-stop",
                num_stops=num_stops,
                avg_lap_time=float(avg_lap_time) if not np.isnan(avg_lap_time) else 0,
                best_lap_time=float(best_lap_time) if not np.isnan(best_lap_time) else 0,
                total_laps=total_laps,
                pit_stop_laps=pit_laps
            ))
        
        # Filter by strategy type
        if strategy_filter:
            strategies = [s for s in strategies if s.strategy_type in strategy_filter]
        
        # Sort by position
        strategies.sort(key=lambda x: x.position)
        
        # Calculate efficiency data
        efficiency_data = self._calculate_efficiency(strategies, pit_time_loss)
        
        # Extract pit stop data
        pit_stop_list = []
        if not pit_stops_df.empty:
            for _, row in pit_stops_df.iterrows():
                pit_stop_list.append(PitStopData(
                    driver_id=row['driverId'],
                    stop_number=int(row['stop']),
                    lap=int(row['lap']),
                    duration=float(row['duration'])
                ))
        
        # Build lap progression for top 5
        lap_progression = {}
        top_drivers = sorted(driver_positions.items(), key=lambda x: x[1])[:5]
        
        for driver_id, _ in top_drivers:
            driver_laps = lap_times_df[lap_times_df['driverId'] == driver_id]
            lap_data = []
            for _, row in driver_laps.iterrows():
                lap_data.append({
                    "lap": int(row['lap']),
                    "time": self.parse_lap_time(row['time'])
                })
            lap_progression[driver_id] = lap_data
        
        # Get winner
        winner = driver_names.get(results_df.iloc[0]['Driver']['driverId'], "Unknown") if not results_df.empty else "Unknown"
        finishers = len(results_df[results_df['status'] == 'Finished']) if 'status' in results_df.columns else len(results_df)
        
        return HistoricalStrategyResponse(
            race_name=race_name,
            year=year,
            winner=winner,
            total_finishers=finishers,
            strategy_table=strategies,
            efficiency_data=efficiency_data,
            pit_stops=pit_stop_list,
            lap_progression=lap_progression
        )
    
    def _calculate_efficiency(
        self,
        strategies: List[StrategyEntry],
        pit_time_loss: float
    ) -> List[StrategyEfficiency]:
        """Calculate strategy efficiency metrics"""
        
        # Group by strategy type
        strategy_groups = {}
        for s in strategies:
            if s.strategy_type not in strategy_groups:
                strategy_groups[s.strategy_type] = []
            strategy_groups[s.strategy_type].append(s)
        
        efficiency_data = []
        best_race_time = float('inf')
        
        # First pass: calculate race times
        for strat_type, entries in strategy_groups.items():
            avg_pace = np.mean([e.avg_lap_time for e in entries if e.avg_lap_time > 0])
            avg_laps = np.mean([e.total_laps for e in entries])
            avg_stops = np.mean([e.num_stops for e in entries])
            
            total_pit_loss = avg_stops * pit_time_loss
            est_race_time = avg_pace * avg_laps + total_pit_loss
            
            if est_race_time < best_race_time:
                best_race_time = est_race_time
            
            efficiency_data.append({
                "type": strat_type,
                "count": len(entries),
                "avg_pace": avg_pace,
                "pit_loss": total_pit_loss,
                "race_time": est_race_time
            })
        
        # Second pass: calculate delta to optimal
        return [
            StrategyEfficiency(
                strategy_type=e["type"],
                driver_count=e["count"],
                avg_pace=float(e["avg_pace"]),
                total_pit_time_loss=float(e["pit_loss"]),
                estimated_race_time=float(e["race_time"]),
                delta_to_optimal=float(e["race_time"] - best_race_time)
            )
            for e in efficiency_data
        ]


# Singleton instance
historical_strategy_service = HistoricalStrategyService()
