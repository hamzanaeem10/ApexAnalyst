"""
Telemetry Analysis Service
Handles driver telemetry comparison and trajectory analysis
"""

import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
import logging
from scipy import interpolate

from app.models.schemas import (
    TelemetryPoint, TrajectoryPoint, DriverTelemetry
)

logger = logging.getLogger(__name__)


class TelemetryService:
    """Service for telemetry analysis operations"""
    
    @staticmethod
    def ensure_telemetry_ready(session_id: str) -> bool:
        """Ensure telemetry is loaded for the session"""
        # Import here to avoid circular import
        from app.services.session_service import get_session_manager
        manager = get_session_manager()
        return manager.ensure_telemetry_loaded(session_id)
    
    @staticmethod
    def get_driver_lap(session, driver_id: str, lap_number: Optional[int] = None):
        """
        Get a specific lap or fastest lap for a driver
        """
        driver_laps = session.laps.pick_drivers(driver_id)
        
        if lap_number is not None:
            lap = driver_laps[driver_laps['LapNumber'] == lap_number]
            if lap.empty:
                raise ValueError(f"Lap {lap_number} not found for driver {driver_id}")
            return lap.iloc[0]
        else:
            # Get fastest lap
            valid_laps = driver_laps[driver_laps['LapTime'].notna()]
            if valid_laps.empty:
                raise ValueError(f"No valid laps found for driver {driver_id}")
            return valid_laps.loc[valid_laps['LapTime'].idxmin()]
    
    @staticmethod
    def extract_telemetry(
        lap,
        start_dist: Optional[float] = None,
        end_dist: Optional[float] = None
    ) -> Tuple[List[TelemetryPoint], List[TrajectoryPoint], Dict[str, float]]:
        """
        Extract telemetry and trajectory data from a lap
        
        Returns:
            (telemetry_points, trajectory_points, stats_dict)
        """
        tel = lap.get_telemetry()
        
        # Filter by distance if specified
        if start_dist is not None and end_dist is not None:
            mask = (tel['Distance'] >= start_dist) & (tel['Distance'] <= end_dist)
            tel = tel[mask].copy()
        
        if tel.empty:
            return [], [], {"min_speed": 0, "max_speed": 0, "avg_speed": 0}
        
        # Extract telemetry points - downsample for performance
        telemetry_points = []
        step = max(1, len(tel) // 500)  # Max 500 points
        
        for i in range(0, len(tel), step):
            row = tel.iloc[i]
            try:
                telemetry_points.append(TelemetryPoint(
                    distance=float(row['Distance']),
                    time=float(row['Time'].total_seconds()) if pd.notna(row.get('Time')) else 0,
                    speed=float(row['Speed']),
                    throttle=float(row.get('Throttle', 0)),
                    brake=float(row.get('Brake', 0)),
                    gear=int(row.get('nGear', 0)),
                    rpm=float(row['RPM']) if 'RPM' in row and pd.notna(row['RPM']) else None,
                    drs=int(row['DRS']) if 'DRS' in row and pd.notna(row['DRS']) else None
                ))
            except Exception as e:
                continue
        
        # Extract trajectory points
        trajectory_points = []
        if 'X' in tel.columns and 'Y' in tel.columns:
            # Downsample for performance
            step = max(1, len(tel) // 200)
            for i in range(0, len(tel), step):
                row = tel.iloc[i]
                try:
                    trajectory_points.append(TrajectoryPoint(
                        x=float(row['X']),
                        y=float(row['Y']),
                        speed=float(row['Speed'])
                    ))
                except:
                    continue
        
        # Calculate stats
        stats = {
            "min_speed": float(tel['Speed'].min()),
            "max_speed": float(tel['Speed'].max()),
            "avg_speed": float(tel['Speed'].mean())
        }
        
        return telemetry_points, trajectory_points, stats
    
    @staticmethod
    def compare_drivers(
        session,
        session_id: str,
        driver_id_1: str,
        driver_id_2: str,
        lap_number_1: Optional[int] = None,
        lap_number_2: Optional[int] = None,
        start_dist: Optional[float] = None,
        end_dist: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Compare telemetry between two drivers
        """
        # Ensure telemetry is loaded before proceeding
        TelemetryService.ensure_telemetry_ready(session_id)
        
        service = TelemetryService()
        
        # Get laps
        lap1 = service.get_driver_lap(session, driver_id_1, lap_number_1)
        lap2 = service.get_driver_lap(session, driver_id_2, lap_number_2)
        
        # Extract telemetry
        tel1, traj1, stats1 = service.extract_telemetry(lap1, start_dist, end_dist)
        tel2, traj2, stats2 = service.extract_telemetry(lap2, start_dist, end_dist)
        
        # Get driver info
        def get_driver_info(session, driver_id):
            try:
                driver = session.get_driver(driver_id)
                return {
                    "name": driver.get('FullName', driver_id),
                    "color": f"#{driver.get('TeamColor', 'FFFFFF')}"
                }
            except:
                return {"name": driver_id, "color": "#FFFFFF"}
        
        d1_info = get_driver_info(session, driver_id_1)
        d2_info = get_driver_info(session, driver_id_2)
        
        # Get lap times
        lap_time_1 = lap1['LapTime'].total_seconds() if pd.notna(lap1['LapTime']) else None
        lap_time_2 = lap2['LapTime'].total_seconds() if pd.notna(lap2['LapTime']) else None
        
        return {
            "driver_1": DriverTelemetry(
                driver_id=driver_id_1,
                driver_name=d1_info["name"],
                team_color=d1_info["color"],
                lap_number=int(lap1['LapNumber']),
                lap_time=lap_time_1,
                telemetry=tel1,
                trajectory=traj1,
                min_speed=stats1["min_speed"],
                max_speed=stats1["max_speed"],
                avg_speed=stats1["avg_speed"]
            ),
            "driver_2": DriverTelemetry(
                driver_id=driver_id_2,
                driver_name=d2_info["name"],
                team_color=d2_info["color"],
                lap_number=int(lap2['LapNumber']),
                lap_time=lap_time_2,
                telemetry=tel2,
                trajectory=traj2,
                min_speed=stats2["min_speed"],
                max_speed=stats2["max_speed"],
                avg_speed=stats2["avg_speed"]
            ),
            "speed_delta": (lap_time_2 - lap_time_1) if (lap_time_1 and lap_time_2) else 0.0,
            "segment_info": {
                "start": start_dist,
                "end": end_dist
            } if start_dist is not None and end_dist is not None else None,
            # Delta-T data for cumulative time loss visualization
            "delta_t": service.calculate_delta_t(lap1, lap2),
            # Track map data with coordinates and telemetry
            "track_map": service.get_track_map_data(lap1, lap2)
        }
    
    @staticmethod
    def calculate_delta_t(lap1, lap2) -> List[Dict[str, float]]:
        """
        Calculate cumulative time difference (Delta-T) between two laps
        along the distance axis. Shows where time is gained/lost.
        """
        try:
            tel1 = lap1.get_telemetry()
            tel2 = lap2.get_telemetry()
            
            if tel1.empty or tel2.empty:
                return []
            
            # Get distance and time arrays
            dist1 = tel1['Distance'].values
            time1 = np.array([t.total_seconds() if pd.notna(t) else 0 for t in tel1['Time']])
            
            dist2 = tel2['Distance'].values
            time2 = np.array([t.total_seconds() if pd.notna(t) else 0 for t in tel2['Time']])
            
            # Create common distance points for interpolation
            max_dist = min(dist1.max(), dist2.max())
            common_dist = np.linspace(0, max_dist, min(500, int(max_dist / 10)))
            
            # Interpolate times at common distances
            try:
                interp1 = interpolate.interp1d(dist1, time1, kind='linear', fill_value='extrapolate')
                interp2 = interpolate.interp1d(dist2, time2, kind='linear', fill_value='extrapolate')
                
                time1_interp = interp1(common_dist)
                time2_interp = interp2(common_dist)
            except Exception:
                return []
            
            # Calculate cumulative delta (driver 2 - driver 1)
            # Positive = driver 1 faster (driver 2 losing time)
            # Negative = driver 2 faster (driver 2 gaining time)
            delta_t = time2_interp - time1_interp
            
            # Downsample for output (max 200 points)
            step = max(1, len(common_dist) // 200)
            result = []
            
            for i in range(0, len(common_dist), step):
                result.append({
                    "distance": round(float(common_dist[i]), 1),
                    "delta": round(float(delta_t[i]), 4),
                    "time_1": round(float(time1_interp[i]), 4),
                    "time_2": round(float(time2_interp[i]), 4)
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating Delta-T: {e}")
            return []
    
    @staticmethod
    def get_track_map_data(lap1, lap2) -> Dict[str, Any]:
        """
        Get track map coordinates with speed and gear data for visualization.
        Returns x,y coordinates with corresponding telemetry for coloring.
        """
        try:
            tel1 = lap1.get_telemetry()
            tel2 = lap2.get_telemetry()
            
            if tel1.empty or 'X' not in tel1.columns or 'Y' not in tel1.columns:
                return {"driver_1": [], "driver_2": [], "track_path": []}
            
            def extract_track_data(tel, max_points=300):
                """Extract track map data from telemetry"""
                step = max(1, len(tel) // max_points)
                points = []
                
                for i in range(0, len(tel), step):
                    row = tel.iloc[i]
                    try:
                        points.append({
                            "x": float(row['X']),
                            "y": float(row['Y']),
                            "distance": float(row['Distance']),
                            "speed": float(row['Speed']),
                            "gear": int(row.get('nGear', 0)),
                            "throttle": float(row.get('Throttle', 0)),
                            "brake": float(row.get('Brake', 0))
                        })
                    except:
                        continue
                
                return points
            
            # Get data for both drivers
            driver1_data = extract_track_data(tel1)
            driver2_data = extract_track_data(tel2) if not tel2.empty and 'X' in tel2.columns else []
            
            # Create simplified track path (just x,y for outline)
            track_path = []
            step = max(1, len(tel1) // 200)
            for i in range(0, len(tel1), step):
                row = tel1.iloc[i]
                try:
                    track_path.append({
                        "x": float(row['X']),
                        "y": float(row['Y'])
                    })
                except:
                    continue
            
            # Get speed ranges for color scaling
            all_speeds = [p['speed'] for p in driver1_data + driver2_data]
            min_speed = min(all_speeds) if all_speeds else 0
            max_speed = max(all_speeds) if all_speeds else 300
            
            return {
                "driver_1": driver1_data,
                "driver_2": driver2_data,
                "track_path": track_path,
                "speed_range": {"min": min_speed, "max": max_speed},
                "gear_range": {"min": 1, "max": 8}
            }
            
        except Exception as e:
            logger.error(f"Error getting track map data: {e}")
            return {"driver_1": [], "driver_2": [], "track_path": []}
    
    @staticmethod
    def get_available_laps(session, driver_id: str) -> List[Dict]:
        """Get list of available laps for a driver"""
        driver_laps = session.laps.pick_drivers(driver_id)
        
        laps = []
        for _, lap in driver_laps.iterrows():
            if pd.notna(lap['LapTime']):
                laps.append({
                    "lap_number": int(lap['LapNumber']),
                    "lap_time": lap['LapTime'].total_seconds(),
                    "sector_1": lap['Sector1Time'].total_seconds() if pd.notna(lap.get('Sector1Time')) else None,
                    "sector_2": lap['Sector2Time'].total_seconds() if pd.notna(lap.get('Sector2Time')) else None,
                    "sector_3": lap['Sector3Time'].total_seconds() if pd.notna(lap.get('Sector3Time')) else None,
                    "compound": lap.get('Compound', 'UNKNOWN'),
                    "tyre_life": int(lap.get('TyreLife', 0)) if pd.notna(lap.get('TyreLife')) else None,
                    "is_personal_best": bool(lap.get('IsPersonalBest', False))
                })
        
        return laps


# Singleton instance
telemetry_service = TelemetryService()


def get_telemetry_service() -> TelemetryService:
    return telemetry_service
