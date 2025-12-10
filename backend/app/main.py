"""
Apex Analyst API - F1 Race Strategy & Performance Analytics Platform
FastAPI Backend Entry Point
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fastf1

from app.core.config import get_settings
from app.api import (
    session_router,
    telemetry_router,
    lap_router,
    weather_router,
    strategy_router,
    circuit_router
)
from app.services.session_service import get_session_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events"""
    # Startup
    logger.info("Starting Apex Analyst API...")
    
    # Configure FastF1 cache
    try:
        fastf1.Cache.enable_cache(settings.fastf1_cache_dir)
        logger.info(f"FastF1 cache enabled at: {settings.fastf1_cache_dir}")
    except Exception as e:
        logger.warning(f"Could not enable FastF1 cache: {e}")
    
    # Initialize session manager
    session_manager = get_session_manager()
    logger.info("Session manager initialized")
    
    logger.info(f"Apex Analyst API v{settings.app_version} started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Apex Analyst API...")
    
    # Clear session cache
    session_manager = get_session_manager()
    session_manager.clear_all_sessions()
    logger.info("Session cache cleared")
    
    logger.info("Apex Analyst API shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    ## Apex Analyst API
    
    F1 Race Strategy & Performance Analytics Platform API
    
    ### Features:
    - **Session Management**: Load and cache F1 session data from FastF1
    - **Telemetry Analysis**: Compare driver telemetry data lap-by-lap
    - **Lap Performance**: Analyze lap times with tyre compound information
    - **Weather Correlation**: Study impact of weather on performance
    - **Historical Strategy**: Analyze pit stop strategies across seasons
    - **Segment Analysis**: Mini-sector and corner performance comparison
    
    ### Data Sources:
    - FastF1 for real-time and recent historical data
    - Jolpica F1 API for extended historical data
    """,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for container orchestration"""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version
    }


# API info endpoint
@app.get("/", tags=["Info"])
async def root():
    """Root endpoint with API information"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "F1 Race Strategy & Performance Analytics Platform API",
        "documentation": "/docs",
        "endpoints": {
            "session": "/api/v1/session",
            "telemetry": "/api/v1/telemetry",
            "lap": "/api/v1/lap",
            "weather": "/api/v1/weather",
            "strategy": "/api/v1/strategy",
            "circuit": "/api/v1/circuit"
        }
    }


# Include API routers with versioned prefix
API_V1_PREFIX = "/api/v1"

app.include_router(
    session_router,
    prefix=f"{API_V1_PREFIX}/session",
    tags=["Session Management"]
)

app.include_router(
    telemetry_router,
    prefix=f"{API_V1_PREFIX}/telemetry",
    tags=["Telemetry Analysis"]
)

app.include_router(
    lap_router,
    prefix=f"{API_V1_PREFIX}/lap",
    tags=["Lap Performance"]
)

app.include_router(
    weather_router,
    prefix=f"{API_V1_PREFIX}/weather",
    tags=["Weather Correlation"]
)

app.include_router(
    strategy_router,
    prefix=f"{API_V1_PREFIX}/strategy",
    tags=["Historical Strategy"]
)

app.include_router(
    circuit_router,
    prefix=f"{API_V1_PREFIX}/circuit",
    tags=["Circuit Segment Analysis"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
