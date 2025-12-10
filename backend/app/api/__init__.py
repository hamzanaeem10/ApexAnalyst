"""
API Routers package initialization
"""

from .session import router as session_router
from .telemetry import router as telemetry_router
from .lap import router as lap_router
from .weather import router as weather_router
from .strategy import router as strategy_router
from .circuit import router as circuit_router
from .race import router as race_router
from .advanced_strategy import router as advanced_strategy_router
from .advanced_weather import router as advanced_weather_router
from .advanced_segments import router as advanced_segments_router

__all__ = [
    "session_router",
    "telemetry_router", 
    "lap_router",
    "weather_router",
    "strategy_router",
    "circuit_router",
    "race_router",
    "advanced_strategy_router",
    "advanced_weather_router",
    "advanced_segments_router"
]
