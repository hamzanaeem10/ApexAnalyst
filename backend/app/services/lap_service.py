"""
Lap Analysis Service
Handles lap time decomposition, sector analysis, and tire degradation
"""

import pandas as pd
import numpy as np
from scipy import stats
from typing import Optional, List, Dict, Any, Tuple
import logging

from app.models.schemas import (
    SectorDelta, StintData, LapPerformanceResponse
)

logger = logging.getLogger(__name__)


class LapAnalysisService:
    """Service for lap time analysis operations"""
    
    @staticmethod
    def calculate_best_sectors(laps: pd.DataFrame) -> Dict[str, float]:
        """Calculate best sector times from lap data"""
        return {
            "S1": laps['Sector1Time'].min().total_seconds() if pd.notna(laps['Sector1Time'].min()) else 0,
            "S2": laps['Sector2Time'].min().total_seconds() if pd.notna(laps['Sector2Time'].min()) else 0,
            "S3": laps['Sector3Time'].min().total_seconds() if pd.notna(laps['Sector3Time'].min()) else 0
        }
    
    @staticmethod
    def calculate_theoretical_best(laps: pd.DataFrame) -> float:
        """Calculate theoretical best lap time"""
        sectors = LapAnalysisService.calculate_best_sectors(laps)
        return sectors["S1"] + sectors["S2"] + sectors["S3"]
    
    @staticmethod
    def calculate_sector_deltas(
        driver_laps: pd.DataFrame,
        session_laps: pd.DataFrame
    ) -> List[SectorDelta]:
        """Calculate sector deltas vs session best"""
        driver_sectors = LapAnalysisService.calculate_best_sectors(driver_laps)
        
        session_laps_valid = session_laps[session_laps['LapTime'].notna()]
        session_sectors = {
            "S1": session_laps_valid['Sector1Time'].min().total_seconds() if pd.notna(session_laps_valid['Sector1Time'].min()) else 0,
            "S2": session_laps_valid['Sector2Time'].min().total_seconds() if pd.notna(session_laps_valid['Sector2Time'].min()) else 0,
            "S3": session_laps_valid['Sector3Time'].min().total_seconds() if pd.notna(session_laps_valid['Sector3Time'].min()) else 0
        }
        
        deltas = []
        for i, sector in enumerate(["S1", "S2", "S3"], 1):
            deltas.append(SectorDelta(
                sector=i,
                driver_time=driver_sectors[sector],
                session_best=session_sectors[sector],
                delta=driver_sectors[sector] - session_sectors[sector]
            ))
        
        return deltas
    
    @staticmethod
    def calculate_tire_degradation(laps: pd.DataFrame, compound: str) -> Tuple[Optional[float], Optional[float]]:
        """
        Calculate tire degradation rate for a compound
        Returns (degradation_rate, r_squared)
        """
        compound_laps = laps[laps['Compound'] == compound].copy()
        compound_laps = compound_laps[compound_laps['IsAccurate'] == True]
        
        if len(compound_laps) < 3:
            return None, None
        
        lap_times = compound_laps['LapTime'].dt.total_seconds()
        lap_numbers = compound_laps['LapNumber'].values
        
        try:
            slope, intercept, r_value, p_value, std_err = stats.linregress(lap_numbers, lap_times)
            return float(slope), float(r_value ** 2)
        except Exception as e:
            logger.warning(f"Error calculating degradation: {e}")
            return None, None
    
    @staticmethod
    def analyze_stints(laps: pd.DataFrame) -> List[StintData]:
        """Analyze stint data including degradation"""
        stints = []
        
        # Tire compound colors
        compound_colors = {
            "SOFT": "#FF0000",
            "MEDIUM": "#FFFF00",
            "HARD": "#FFFFFF",
            "INTERMEDIATE": "#00FF00",
            "WET": "#0000FF"
        }
        
        # Group by stint
        stint_groups = laps.groupby('Stint')
        
        for stint_num, stint_laps in stint_groups:
            if stint_laps.empty:
                continue
            
            compound = stint_laps['Compound'].iloc[0] if 'Compound' in stint_laps.columns else "UNKNOWN"
            
            # Calculate degradation
            deg_rate, r_squared = LapAnalysisService.calculate_tire_degradation(stint_laps, compound)
            
            # Extract lap times
            lap_times_data = []
            for _, lap in stint_laps.iterrows():
                if pd.notna(lap['LapTime']):
                    lap_times_data.append({
                        "lap_number": int(lap['LapNumber']),
                        "lap_time": lap['LapTime'].total_seconds(),
                        "is_accurate": bool(lap.get('IsAccurate', True))
                    })
            
            stints.append(StintData(
                stint_number=int(stint_num),
                compound=compound,
                compound_color=compound_colors.get(compound, "#CCCCCC"),
                start_lap=int(stint_laps['LapNumber'].min()),
                end_lap=int(stint_laps['LapNumber'].max()),
                total_laps=len(stint_laps),
                degradation_rate=deg_rate,
                r_squared=r_squared,
                lap_times=lap_times_data
            ))
        
        return stints
    
    @staticmethod
    def analyze_driver_performance(session, driver_id: str) -> LapPerformanceResponse:
        """Complete performance analysis for a driver"""
        driver_laps = session.laps.pick_driver(driver_id)
        all_laps = session.laps
        
        # Filter valid laps
        valid_driver_laps = driver_laps[driver_laps['LapTime'].notna()]
        
        if valid_driver_laps.empty:
            raise ValueError(f"No valid laps for driver {driver_id}")
        
        # Get driver info
        try:
            driver = session.get_driver(driver_id)
            driver_name = driver.get('FullName', driver_id)
            team_color = f"#{driver.get('TeamColor', 'FFFFFF')}"
        except:
            driver_name = driver_id
            team_color = "#FFFFFF"
        
        # Calculate times
        theoretical = LapAnalysisService.calculate_theoretical_best(valid_driver_laps)
        actual_best = valid_driver_laps['LapTime'].min().total_seconds()
        time_lost = actual_best - theoretical
        time_lost_pct = (time_lost / theoretical) * 100 if theoretical > 0 else 0
        
        # Best sectors
        best_sectors = LapAnalysisService.calculate_best_sectors(valid_driver_laps)
        
        # Sector deltas
        sector_deltas = LapAnalysisService.calculate_sector_deltas(valid_driver_laps, all_laps)
        
        # Stint analysis
        stint_summary = LapAnalysisService.analyze_stints(valid_driver_laps)
        
        return LapPerformanceResponse(
            driver_id=driver_id,
            driver_name=driver_name,
            team_color=team_color,
            theoretical_lap=theoretical,
            actual_best_lap=actual_best,
            time_lost=time_lost,
            time_lost_percent=time_lost_pct,
            best_sectors=best_sectors,
            sector_deltas=sector_deltas,
            stint_summary=stint_summary
        )


# Singleton instance
lap_analysis_service = LapAnalysisService()
