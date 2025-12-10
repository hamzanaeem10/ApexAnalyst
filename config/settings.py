"""
Apex Analyst Configuration Settings
Global configuration for the F1 Analytics Platform
"""

import os
from pathlib import Path

# Project Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = PROJECT_ROOT / "cache"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

# FastF1 Configuration
FASTF1_CACHE_DIR = CACHE_DIR / "fastf1"
FASTF1_CACHE_DIR.mkdir(exist_ok=True)

# Application Settings
APP_NAME = "Apex Analyst"
APP_SUBTITLE = "F1 Race Strategy & Performance Analytics"
VERSION = "1.0.0"

# Season Configuration
CURRENT_SEASON = 2024
AVAILABLE_SEASONS = list(range(2018, 2025))

# Session Types
SESSION_TYPES = {
    "FP1": "Free Practice 1",
    "FP2": "Free Practice 2", 
    "FP3": "Free Practice 3",
    "Q": "Qualifying",
    "S": "Sprint",
    "SQ": "Sprint Qualifying",
    "R": "Race"
}

# Tire Compounds
TIRE_COMPOUNDS = {
    "SOFT": {"color": "#FF0000", "abbrev": "S"},
    "MEDIUM": {"color": "#FFFF00", "abbrev": "M"},
    "HARD": {"color": "#FFFFFF", "abbrev": "H"},
    "INTERMEDIATE": {"color": "#00FF00", "abbrev": "I"},
    "WET": {"color": "#0000FF", "abbrev": "W"}
}

# Team Colors (2024 Season)
TEAM_COLORS = {
    "Red Bull Racing": "#3671C6",
    "Ferrari": "#E80020",
    "Mercedes": "#27F4D2",
    "McLaren": "#FF8000",
    "Aston Martin": "#229971",
    "Alpine": "#FF87BC",
    "Williams": "#64C4FF",
    "RB": "#6692FF",
    "Kick Sauber": "#52E252",
    "Haas F1 Team": "#B6BABD"
}

# Visualization Settings
PLOT_STYLE = {
    "figure.figsize": (12, 6),
    "axes.titlesize": 14,
    "axes.labelsize": 12,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "legend.fontsize": 10,
    "figure.dpi": 100
}

# Default analysis parameters
DEFAULT_LAP_THRESHOLD = 5
DEFAULT_ROLLING_WINDOW = 5
