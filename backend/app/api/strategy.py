"""
Strategy API Router
Handles historical strategy analysis endpoints
"""

from fastapi import APIRouter, HTTPException, Path
from typing import List
import logging

from app.models.schemas import (
    HistoricalStrategyRequest, HistoricalStrategyResponse
)
from app.services.strategy_service import historical_strategy_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Strategy"])


@router.post("/historical", response_model=HistoricalStrategyResponse)
async def analyze_historical_strategy(request: HistoricalStrategyRequest):
    """
    Analyze historical race strategies.
    
    Uses the Jolpica F1 API for historical data.
    Returns strategy breakdown, efficiency metrics, and pit stop analysis.
    """
    try:
        result = historical_strategy_service.analyze_strategies(
            year=request.year,
            race_round=request.race_round,
            strategy_filter=request.strategy_filter,
            pit_time_loss=request.pit_time_loss
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing strategy: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze strategy: {str(e)}"
        )


@router.get("/races/{year}")
async def get_races_for_year(year: int = Path(..., ge=2010, le=2025)):
    """Get list of races for a given year"""
    try:
        races = historical_strategy_service.get_races(year)
        
        return {
            "year": year,
            "total_races": len(races),
            "races": [
                {
                    "round": int(r.get('round', 0)),
                    "race_name": r.get('raceName', ''),
                    "circuit": r.get('Circuit', {}).get('circuitName', ''),
                    "country": r.get('Circuit', {}).get('Location', {}).get('country', ''),
                    "date": r.get('date', '')
                }
                for r in races
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting races: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get races: {str(e)}"
        )
