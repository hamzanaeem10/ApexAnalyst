"""
Session Management Service
Handles FastF1 session loading, caching, and data extraction
Optimized for low latency with lazy loading
"""

import fastf1
import pandas as pd
import numpy as np
from typing import Dict, Optional, List, Any, Tuple
from datetime import datetime
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from enum import Enum

from app.core.config import get_settings
from app.models.schemas import (
    DriverInfo, TeamInfo, TrackData, TrackPoint, SegmentDefinition
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize FastF1 cache - this is KEY for performance
fastf1.Cache.enable_cache(settings.fastf1_cache_dir)

# Thread pool for background loading
executor = ThreadPoolExecutor(max_workers=2)


class LoadingState(str, Enum):
    """Session loading states"""
    PENDING = "pending"
    LOADING_BASIC = "loading_basic"
    LOADING_LAPS = "loading_laps"
    LOADING_TELEMETRY = "loading_telemetry"
    READY = "ready"
    ERROR = "error"


class SessionManager:
    """
    Manages F1 session data with caching and lazy loading
    Ensures sessions are loaded once and reused for subsequent requests
    
    Optimization strategy:
    1. Quick load: Load basic session info first (drivers, teams, laps) ~5-10 seconds
    2. Background load: Load telemetry in background
    3. Cache: Once loaded, session stays in memory
    """
    
    _instance = None
    _sessions: Dict[str, Any] = {}
    _session_metadata: Dict[str, Dict] = {}
    _loading_states: Dict[str, LoadingState] = {}
    _loading_futures: Dict[str, Any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @staticmethod
    def _generate_session_id(year: int, grand_prix: str, session_name: str) -> str:
        """Generate unique session identifier"""
        key = f"{year}_{grand_prix}_{session_name}"
        return hashlib.md5(key.encode()).hexdigest()[:12]
    
    def get_loading_state(self, session_id: str) -> LoadingState:
        """Get the loading state of a session"""
        return self._loading_states.get(session_id, LoadingState.PENDING)
    
    def _load_session_sync(self, year: int, grand_prix: str, session_name: str, 
                           session_id: str, quick: bool = True) -> Any:
        """
        Synchronous session loading with optional quick mode
        Quick mode: Only loads basic info (drivers, laps) - much faster
        Full mode: Loads everything including telemetry
        """
        try:
            self._loading_states[session_id] = LoadingState.LOADING_BASIC
            logger.info(f"Loading session: {year} {grand_prix} {session_name} (quick={quick})")
            
            session = fastf1.get_session(year, grand_prix, session_name)
            
            if quick:
                # Quick load - just get basic info without telemetry
                # This is MUCH faster (~5-10 sec vs 30-60 sec)
                session.load(
                    laps=True,          # Need laps for basic info
                    telemetry=False,    # Skip telemetry initially
                    weather=False,      # Skip weather initially
                    messages=False      # Skip race messages
                )
            else:
                # Full load - everything
                self._loading_states[session_id] = LoadingState.LOADING_TELEMETRY
                session.load()
            
            self._sessions[session_id] = session
            self._session_metadata[session_id] = {
                "year": year,
                "grand_prix": grand_prix,
                "session_name": session_name,
                "loaded_at": datetime.now().isoformat(),
                "full_load": not quick
            }
            self._loading_states[session_id] = LoadingState.READY
            
            return session
            
        except Exception as e:
            logger.error(f"Error loading session: {e}")
            self._loading_states[session_id] = LoadingState.ERROR
            raise
    
    def _upgrade_session_sync(self, session_id: str) -> None:
        """Upgrade a quick-loaded session to full load (with telemetry)"""
        if session_id not in self._sessions:
            return
            
        metadata = self._session_metadata.get(session_id, {})
        if metadata.get("full_load", False):
            return  # Already fully loaded
        
        try:
            self._loading_states[session_id] = LoadingState.LOADING_TELEMETRY
            session = self._sessions[session_id]
            
            logger.info(f"Upgrading session {session_id} to full load (telemetry)")
            
            # Load telemetry and weather
            session.load(
                laps=False,  # Already loaded
                telemetry=True,
                weather=True,
                messages=False
            )
            
            metadata["full_load"] = True
            self._session_metadata[session_id] = metadata
            self._loading_states[session_id] = LoadingState.READY
            
            logger.info(f"Session {session_id} upgraded to full load")
            
        except Exception as e:
            logger.error(f"Error upgrading session: {e}")
            # Keep session usable, just mark as not fully loaded
            self._loading_states[session_id] = LoadingState.READY
    
    def get_session(self, year: int, grand_prix: str, session_name: str, 
                    quick: bool = True) -> Tuple[str, Any]:
        """
        Get or load a session
        Returns (session_id, session_object)
        
        Args:
            quick: If True, loads only basic data first (fast), then upgrades in background
        """
        session_id = self._generate_session_id(year, grand_prix, session_name)
        
        if session_id not in self._sessions:
            # Load synchronously (quick mode is fast enough)
            self._load_session_sync(year, grand_prix, session_name, session_id, quick=quick)
            
            # Start background upgrade to full load
            if quick:
                future = executor.submit(self._upgrade_session_sync, session_id)
                self._loading_futures[session_id] = future
        else:
            logger.info(f"Using cached session: {session_id}")
        
        return session_id, self._sessions[session_id]
    
    def get_session_by_id(self, session_id: str) -> Optional[Any]:
        """Get session by ID"""
        return self._sessions.get(session_id)
    
    def ensure_telemetry_loaded(self, session_id: str) -> bool:
        """
        Ensure telemetry is loaded for a session.
        Blocks until telemetry is available.
        Returns True if telemetry is ready.
        """
        metadata = self._session_metadata.get(session_id, {})
        
        if metadata.get("full_load", False):
            return True
        
        # Check if there's a pending upgrade
        future = self._loading_futures.get(session_id)
        if future:
            try:
                future.result(timeout=120)  # Wait up to 2 minutes
                return True
            except Exception as e:
                logger.error(f"Error waiting for telemetry: {e}")
                # Try to load synchronously
                self._upgrade_session_sync(session_id)
                return self._session_metadata.get(session_id, {}).get("full_load", False)
        else:
            # No pending upgrade, do it now
            self._upgrade_session_sync(session_id)
            return self._session_metadata.get(session_id, {}).get("full_load", False)
    
    def extract_drivers(self, session) -> List[DriverInfo]:
        """Extract driver information from session"""
        drivers = []
        results = session.results
        
        for _, row in results.iterrows():
            try:
                drivers.append(DriverInfo(
                    driver_id=row['Abbreviation'],
                    abbreviation=row['Abbreviation'],
                    full_name=row.get('FullName', f"{row.get('FirstName', '')} {row.get('LastName', '')}"),
                    team_name=row['TeamName'],
                    team_color=f"#{row.get('TeamColor', 'FFFFFF')}",
                    driver_number=int(row.get('DriverNumber', 0))
                ))
            except Exception as e:
                logger.warning(f"Error extracting driver: {e}")
                continue
        
        return drivers
    
    def extract_teams(self, session) -> List[TeamInfo]:
        """Extract team information from session"""
        teams_dict = {}
        results = session.results
        
        for _, row in results.iterrows():
            team_name = row['TeamName']
            if team_name not in teams_dict:
                teams_dict[team_name] = {
                    "team_id": team_name.lower().replace(" ", "_"),
                    "name": team_name,
                    "color": f"#{row.get('TeamColor', 'FFFFFF')}",
                    "drivers": []
                }
            teams_dict[team_name]["drivers"].append(row['Abbreviation'])
        
        return [TeamInfo(**team) for team in teams_dict.values()]
    
    def extract_track_data(self, session) -> TrackData:
        """Extract track layout and segment data"""
        try:
            track_name = session.event['EventName'] if hasattr(session, 'event') else 'Unknown'
            
            # Try to get track path from fastest lap telemetry
            track_path = []
            track_length = 5000.0  # Default
            
            try:
                # Only attempt if telemetry might be loaded
                if hasattr(session, 'laps') and len(session.laps) > 0:
                    fastest_lap = session.laps.pick_fastest()
                    
                    # Check if telemetry is available
                    if fastest_lap is not None:
                        try:
                            telemetry = fastest_lap.get_telemetry()
                            
                            if telemetry is not None and len(telemetry) > 0:
                                # Extract track path
                                if 'X' in telemetry.columns and 'Y' in telemetry.columns:
                                    # Downsample for performance
                                    step = max(1, len(telemetry) // 500)
                                    for i in range(0, len(telemetry), step):
                                        track_path.append(TrackPoint(
                                            x=float(telemetry['X'].iloc[i]),
                                            y=float(telemetry['Y'].iloc[i])
                                        ))
                                
                                if 'Distance' in telemetry.columns:
                                    track_length = float(telemetry['Distance'].max())
                        except Exception as e:
                            logger.debug(f"Telemetry not available yet: {e}")
            except Exception as e:
                logger.debug(f"Could not extract track path: {e}")
            
            # Generate basic segment definitions
            num_segments = 10
            segment_length = track_length / num_segments
            segments = [
                SegmentDefinition(
                    name=f"Segment {i+1}",
                    start_distance=i * segment_length,
                    end_distance=(i + 1) * segment_length
                )
                for i in range(num_segments)
            ]
            
            return TrackData(
                track_name=track_name,
                track_length=track_length,
                track_path=track_path,
                segment_definitions=segments
            )
            
        except Exception as e:
            logger.error(f"Error extracting track data: {e}")
            return TrackData(
                track_name="Unknown",
                track_length=5000.0,
                track_path=[],
                segment_definitions=[]
            )
    
    def clear_session(self, session_id: str) -> bool:
        """Clear a specific session from cache"""
        if session_id in self._sessions:
            del self._sessions[session_id]
            del self._session_metadata[session_id]
            self._loading_states.pop(session_id, None)
            self._loading_futures.pop(session_id, None)
            return True
        return False
    
    def clear_all_sessions(self) -> int:
        """Clear all sessions from cache"""
        count = len(self._sessions)
        self._sessions.clear()
        self._session_metadata.clear()
        self._loading_states.clear()
        self._loading_futures.clear()
        return count
    
    def get_cache_info(self) -> Dict:
        """Get information about cached sessions"""
        return {
            "cached_sessions": len(self._sessions),
            "sessions": {
                sid: {
                    **meta,
                    "loading_state": self._loading_states.get(sid, LoadingState.PENDING).value
                }
                for sid, meta in self._session_metadata.items()
            }
        }


# Singleton instance
session_manager = SessionManager()


def get_session_manager() -> SessionManager:
    """Get the singleton session manager instance"""
    return session_manager


def get_event_schedule(year: int) -> pd.DataFrame:
    """Get event schedule for a year"""
    return fastf1.get_event_schedule(year)
