"""
Segment Analysis Service
Handles circuit segment performance analysis
"""

import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any
import logging

from app.models.schemas import (
    SegmentLeaderboardEntry, TeamDistribution, DriverSpeedTrace,
    SpeedTracePoint, SegmentAnalysisResponse
)

logger = logging.getLogger(__name__)


class SegmentService:
    """Service for circuit segment analysis"""
    
    @staticmethod
    def filter_telemetry_by_distance(
        telemetry: pd.DataFrame,
        start_dist: float,
        end_dist: float
    ) -> pd.DataFrame:
        """Filter telemetry by distance range"""
        mask = (telemetry['Distance'] >= start_dist) & (telemetry['Distance'] <= end_dist)
        return telemetry[mask].copy()
    
    @staticmethod
    def calculate_segment_metrics(
        session,
        start_dist: float,
        end_dist: float,
        team_filter: Optional[List[str]] = None
    ) -> SegmentAnalysisResponse:
        """
        Analyze segment performance for all drivers
        """
        all_laps = session.laps.pick_quicklaps()
        results = session.results
        
        metrics = []
        speed_traces = []
        
        for driver in session.drivers:
            try:
                driver_laps = all_laps.pick_driver(driver)
                if driver_laps.empty:
                    continue
                
                fastest_lap = driver_laps.pick_fastest()
                if fastest_lap is None:
                    continue
                
                # Get telemetry
                tel = fastest_lap.get_telemetry()
                segment_tel = SegmentService.filter_telemetry_by_distance(tel, start_dist, end_dist)
                
                if segment_tel.empty or len(segment_tel) < 2:
                    continue
                
                # Get driver info
                try:
                    driver_info = session.get_driver(driver)
                    driver_name = driver_info.get('FullName', driver)
                    team = driver_info.get('TeamName', 'Unknown')
                    team_color = f"#{driver_info.get('TeamColor', 'FFFFFF')}"
                except:
                    driver_name = driver
                    team = 'Unknown'
                    team_color = '#FFFFFF'
                
                # Apply team filter
                if team_filter and team not in team_filter:
                    continue
                
                # Calculate metrics
                avg_speed = float(segment_tel['Speed'].mean())
                max_speed = float(segment_tel['Speed'].max())
                min_speed = float(segment_tel['Speed'].min())
                
                # Calculate segment time
                if 'Time' in segment_tel.columns:
                    segment_time = (segment_tel['Time'].iloc[-1] - segment_tel['Time'].iloc[0]).total_seconds()
                else:
                    segment_length = end_dist - start_dist
                    segment_time = (segment_length / 1000) / (avg_speed / 3600) if avg_speed > 0 else 0
                
                metrics.append({
                    'driver_id': driver,
                    'driver_name': driver_name,
                    'team': team,
                    'team_color': team_color,
                    'avg_speed': avg_speed,
                    'max_speed': max_speed,
                    'min_speed': min_speed,
                    'segment_time': segment_time
                })
                
                # Build speed trace (downsampled)
                trace_points = []
                step = max(1, len(segment_tel) // 100)
                for i in range(0, len(segment_tel), step):
                    row = segment_tel.iloc[i]
                    trace_points.append(SpeedTracePoint(
                        distance=float(row['Distance']),
                        speed=float(row['Speed'])
                    ))
                
                speed_traces.append({
                    'driver_id': driver,
                    'driver_name': driver_name,
                    'team': team,
                    'team_color': team_color,
                    'trace': trace_points
                })
                
            except Exception as e:
                logger.warning(f"Error processing driver {driver}: {e}")
                continue
        
        if not metrics:
            raise ValueError("No segment data could be calculated")
        
        # Sort by average speed (descending) for leaderboard
        metrics.sort(key=lambda x: x['avg_speed'], reverse=True)
        leader_speed = metrics[0]['avg_speed']
        
        # Build leaderboard
        leaderboard = []
        for i, m in enumerate(metrics[:10]):  # Top 10
            leaderboard.append(SegmentLeaderboardEntry(
                rank=i + 1,
                driver_id=m['driver_id'],
                driver_name=m['driver_name'],
                team=m['team'],
                team_color=m['team_color'],
                avg_speed=m['avg_speed'],
                max_speed=m['max_speed'],
                min_speed=m['min_speed'],
                segment_time=m['segment_time'],
                speed_delta=m['avg_speed'] - leader_speed
            ))
        
        # Build team distributions
        team_data = {}
        for m in metrics:
            team = m['team']
            if team not in team_data:
                team_data[team] = {
                    'team': team,
                    'team_color': m['team_color'],
                    'times': []
                }
            team_data[team]['times'].append(m['segment_time'])
        
        team_distributions = []
        for team, data in team_data.items():
            times = data['times']
            team_distributions.append(TeamDistribution(
                team=team,
                team_color=data['team_color'],
                segment_times=times,
                mean_time=float(np.mean(times)),
                std_dev=float(np.std(times)) if len(times) > 1 else 0,
                min_time=float(min(times)),
                max_time=float(max(times))
            ))
        
        # Build speed traces response
        leader_id = metrics[0]['driver_id']
        driver_speed_traces = []
        
        for trace in speed_traces[:6]:  # Limit to 6 drivers
            driver_speed_traces.append(DriverSpeedTrace(
                driver_id=trace['driver_id'],
                driver_name=trace['driver_name'],
                team=trace['team'],
                team_color=trace['team_color'],
                is_leader=(trace['driver_id'] == leader_id),
                speed_trace=trace['trace']
            ))
        
        return SegmentAnalysisResponse(
            segment_start=start_dist,
            segment_end=end_dist,
            segment_length=end_dist - start_dist,
            leaderboard=leaderboard,
            team_distributions=team_distributions,
            speed_traces=driver_speed_traces
        )


# Singleton instance
segment_service = SegmentService()
