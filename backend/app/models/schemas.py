"""
Pydantic Models for API Request/Response Schemas
Strictly typed data contracts between frontend and backend
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class SessionType(str, Enum):
    FP1 = "FP1"
    FP2 = "FP2"
    FP3 = "FP3"
    QUALIFYING = "Q"
    SPRINT = "S"
    SPRINT_QUALIFYING = "SQ"
    RACE = "R"


class TireCompound(str, Enum):
    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"


# ============================================================================
# BASE MODELS
# ============================================================================

class APIResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool = True
    message: str = "OK"
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ============================================================================
# SESSION MODELS
# ============================================================================

class SessionLoadRequest(BaseModel):
    """Request to load a session"""
    year: int = Field(..., ge=2018, le=2025, description="Season year")
    grand_prix: str = Field(..., min_length=1, description="Grand Prix name")
    session_name: SessionType = Field(..., description="Session type")


class DriverInfo(BaseModel):
    """Driver information"""
    driver_id: str
    abbreviation: str
    full_name: str
    team_name: str
    team_color: str
    driver_number: int


class TeamInfo(BaseModel):
    """Team information"""
    team_id: str
    name: str
    color: str
    drivers: List[str]


class TrackPoint(BaseModel):
    """Single track coordinate point"""
    x: float
    y: float


class SegmentDefinition(BaseModel):
    """Track segment definition"""
    name: str
    start_distance: float
    end_distance: float


class TrackData(BaseModel):
    """Track layout and segment data"""
    track_name: str
    track_length: float
    track_path: List[TrackPoint]
    segment_definitions: List[SegmentDefinition] = []


class SessionLoadResponse(BaseModel):
    """Response from session load"""
    session_id: str
    year: int
    grand_prix: str
    session_name: str
    drivers: List[DriverInfo]
    teams: List[TeamInfo]
    track_data: TrackData


# ============================================================================
# TELEMETRY MODELS (Module 1)
# ============================================================================

class TelemetryCompareRequest(BaseModel):
    """Request for telemetry comparison"""
    driver_id_1: str = Field(..., description="First driver abbreviation")
    driver_id_2: str = Field(..., description="Second driver abbreviation")
    lap_number_1: Optional[int] = Field(None, description="Specific lap for driver 1 (None = fastest)")
    lap_number_2: Optional[int] = Field(None, description="Specific lap for driver 2 (None = fastest)")
    start_dist: Optional[float] = Field(None, ge=0, description="Segment start distance (m)")
    end_dist: Optional[float] = Field(None, ge=0, description="Segment end distance (m)")


class TelemetryPoint(BaseModel):
    """Single telemetry data point"""
    distance: float
    time: float
    speed: float
    throttle: float
    brake: float
    gear: int
    rpm: Optional[float] = None
    drs: Optional[int] = None


class TrajectoryPoint(BaseModel):
    """Position coordinate for trajectory"""
    x: float
    y: float
    speed: float


class DriverTelemetry(BaseModel):
    """Complete telemetry for a driver"""
    driver_id: str
    driver_name: str
    team_color: str
    lap_number: int
    lap_time: float
    telemetry: List[TelemetryPoint]
    trajectory: List[TrajectoryPoint]
    min_speed: float
    max_speed: float
    avg_speed: float


class TelemetryCompareResponse(BaseModel):
    """Response for telemetry comparison"""
    driver_1: DriverTelemetry
    driver_2: DriverTelemetry
    speed_delta: float  # Driver 2 - Driver 1 time delta
    segment_info: Optional[Dict[str, float]] = None


# ============================================================================
# LAP ANALYSIS MODELS (Module 2)
# ============================================================================

class LapPerformanceRequest(BaseModel):
    """Request for lap performance analysis"""
    driver_id: str = Field(..., description="Driver abbreviation")


class SectorDelta(BaseModel):
    """Sector time delta information"""
    sector: int
    driver_time: float
    session_best: float
    delta: float


class StintData(BaseModel):
    """Single stint information"""
    stint_number: int
    compound: str
    compound_color: str
    start_lap: int
    end_lap: int
    total_laps: int
    degradation_rate: Optional[float]  # seconds per lap
    r_squared: Optional[float]
    lap_times: List[Dict[str, Any]]  # [{lap_number, lap_time, is_accurate}]


class LapPerformanceResponse(BaseModel):
    """Response for lap performance analysis"""
    driver_id: str
    driver_name: str
    team_color: str
    theoretical_lap: float
    actual_best_lap: float
    time_lost: float
    time_lost_percent: float
    best_sectors: Dict[str, float]
    sector_deltas: List[SectorDelta]
    stint_summary: List[StintData]


# ============================================================================
# WEATHER MODELS (Module 3)
# ============================================================================

class WeatherCorrelationRequest(BaseModel):
    """Request for weather correlation analysis"""
    lap_window_size: int = Field(default=5, ge=3, le=15, description="Rolling window size for averaging")
    min_laps: int = Field(default=5, ge=1, description="Minimum laps threshold")


class CorrelationPoint(BaseModel):
    """Single correlation data point"""
    track_temp: float
    air_temp: float
    humidity: float
    avg_lap_time: float
    window_start_lap: int
    window_end_lap: int


class TemperaturePoint(BaseModel):
    """Temperature evolution point"""
    time_minutes: float
    track_temp: float
    air_temp: float
    humidity: Optional[float] = None


class WeatherImpactMetric(BaseModel):
    """Quantified weather impact"""
    variable: str
    delta_per_unit: float
    unit: str
    r_squared: float
    direction: str  # "faster" or "slower"


class WeatherCorrelationResponse(BaseModel):
    """Response for weather correlation analysis"""
    correlation_data: List[CorrelationPoint]
    temperature_evolution: List[TemperaturePoint]
    impact_metrics: List[WeatherImpactMetric]
    rainfall_detected: bool
    temp_range: Dict[str, float]


# ============================================================================
# HISTORICAL STRATEGY MODELS (Module 4)
# ============================================================================

class HistoricalStrategyRequest(BaseModel):
    """Request for historical strategy analysis"""
    year: int = Field(..., ge=2010, le=2024)
    race_round: int = Field(..., ge=1, le=24)
    strategy_filter: List[str] = Field(default=["1-stop", "2-stop"])
    pit_time_loss: float = Field(default=22.0, ge=15, le=35)


class StrategyEntry(BaseModel):
    """Single strategy entry"""
    driver_id: str
    driver_name: str
    position: int
    team: str
    strategy_type: str
    num_stops: int
    avg_lap_time: float
    best_lap_time: float
    total_laps: int
    pit_stop_laps: List[int]


class StrategyEfficiency(BaseModel):
    """Strategy efficiency data"""
    strategy_type: str
    driver_count: int
    avg_pace: float
    total_pit_time_loss: float
    estimated_race_time: float
    delta_to_optimal: float


class PitStopData(BaseModel):
    """Pit stop information"""
    driver_id: str
    stop_number: int
    lap: int
    duration: float


class HistoricalStrategyResponse(BaseModel):
    """Response for historical strategy analysis"""
    race_name: str
    year: int
    winner: str
    total_finishers: int
    strategy_table: List[StrategyEntry]
    efficiency_data: List[StrategyEfficiency]
    pit_stops: List[PitStopData]
    lap_progression: Dict[str, List[Dict[str, Any]]]


# ============================================================================
# SEGMENT ANALYSIS MODELS (Module 5)
# ============================================================================

class SegmentAnalysisRequest(BaseModel):
    """Request for segment analysis"""
    start_dist: float = Field(..., ge=0, description="Segment start distance (m)")
    end_dist: float = Field(..., ge=0, description="Segment end distance (m)")
    team_filter: Optional[List[str]] = Field(None, description="Filter by team names")


class SegmentLeaderboardEntry(BaseModel):
    """Single leaderboard entry"""
    rank: int
    driver_id: str
    driver_name: str
    team: str
    team_color: str
    avg_speed: float
    max_speed: float
    min_speed: float
    segment_time: float
    speed_delta: float  # Delta to leader


class TeamDistribution(BaseModel):
    """Team performance distribution"""
    team: str
    team_color: str
    segment_times: List[float]
    mean_time: float
    std_dev: float
    min_time: float
    max_time: float


class SpeedTracePoint(BaseModel):
    """Speed trace data point"""
    distance: float
    speed: float


class DriverSpeedTrace(BaseModel):
    """Driver's speed trace through segment"""
    driver_id: str
    driver_name: str
    team: str
    team_color: str
    is_leader: bool
    speed_trace: List[SpeedTracePoint]


class SegmentAnalysisResponse(BaseModel):
    """Response for segment analysis"""
    segment_start: float
    segment_end: float
    segment_length: float
    leaderboard: List[SegmentLeaderboardEntry]
    team_distributions: List[TeamDistribution]
    speed_traces: List[DriverSpeedTrace]


# ============================================================================
# SCHEDULE MODELS
# ============================================================================

class EventInfo(BaseModel):
    """Event/Race information"""
    round_number: int
    event_name: str
    country: str
    location: str
    event_date: str
    event_format: str


class ScheduleResponse(BaseModel):
    """Season schedule response"""
    year: int
    events: List[EventInfo]
