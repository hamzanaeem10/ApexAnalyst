"""
Apex Analyst Backend Configuration
Environment and application settings using Pydantic Settings
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from pathlib import Path
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    app_name: str = "Apex Analyst API"
    app_version: str = "2.0.0"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS - Allow all origins in production for Vercel deployment
    cors_origins: list[str] = [
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://apexanalyst.vercel.app",
    ]
    
    # FastF1 Cache
    fastf1_cache_dir: str = Field(default="./cache/fastf1")
    
    # Redis (optional, for production caching)
    redis_url: Optional[str] = None
    
    # Session Cache TTL (seconds)
    session_cache_ttl: int = 3600  # 1 hour
    
    # API Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_period: int = 60  # seconds
    
    # Data Settings
    current_season: int = 2024
    min_season: int = 2018
    max_season: int = 2024
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Ensure cache directory exists
settings = get_settings()
Path(settings.fastf1_cache_dir).mkdir(parents=True, exist_ok=True)
