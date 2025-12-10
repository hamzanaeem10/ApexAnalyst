# Apex Analyst: F1 Race Strategy & Performance Analytics Platform

🏎️ A comprehensive, data-driven F1 analytics platform for race strategists, performance engineers, and driver coaches.

## 🎯 Overview

Apex Analyst integrates FastF1 and jolpica-f1 data to provide actionable insights across five key analytical modules:

1. **Driver Telemetry Comparison** - Compare two drivers through corners
2. **Lap Time Analysis** - Decompose lap times and analyze tire degradation
3. **Weather Correlation** - Understand track condition impacts
4. **Historical Strategy Analysis** - Learn from past race strategies
5. **Circuit Segment Analysis** - Identify performance through specific track sections

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- pip package manager

### Installation

1. Clone or download this project

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
streamlit run app.py
```

5. Open your browser to `http://localhost:8501`

## 📊 Modules

### 1. Driver Telemetry Comparison (The Teammate Duel)
- **Data Sources:** FastF1 telemetry and position data
- **Features:**
  - Side-by-side trajectory plots
  - Telemetry overlays (Speed, Throttle, Brake, Steering)
  - Key stat cards (Min/Max speed per driver)
  - Segment filtering capability

### 2. Lap Time Analysis (The Perfect Lap)
- **Data Sources:** FastF1 lap data and tire information
- **Features:**
  - Theoretical vs Actual best lap comparison
  - Sector delta analysis
  - Lap time progression charts
  - Tire degradation modeling (s/lap for each compound)

### 3. Weather Correlation (The Rain Impact)
- **Data Sources:** FastF1 weather data
- **Features:**
  - Temperature evolution plots
  - Lap time vs track temperature correlation
  - Quantified impact metrics (Δ time per 1°C change)
  - Humidity and wind analysis

### 4. Historical Strategy Analysis (The Pit Stop Planner)
- **Data Sources:** Jolpica F1 API (historical data)
- **Features:**
  - Strategy breakdown tables
  - Pit stop timing analysis
  - Strategy efficiency calculations
  - Lap time progression charts

### 5. Circuit Segment Analysis (The Corner King)
- **Data Sources:** FastF1 position and telemetry data
- **Features:**
  - Custom segment definition (by distance)
  - Speed leaderboard top 10
  - Team performance distribution box plots
  - Comparative speed traces

## 🛠️ Technology Stack

- **Backend:** Python 3.9+
- **Data:** FastF1, Jolpica F1 API (Ergast-compatible)
- **Analysis:** Pandas, NumPy, SciPy
- **Visualization:** Plotly, Matplotlib, Seaborn
- **Web Framework:** Streamlit

## 📁 Project Structure

```
apexanalyst/
├── app.py                 # Main Streamlit application
├── requirements.txt       # Python dependencies
├── README.md             # This file
│
├── config/
│   ├── __init__.py
│   └── settings.py       # Configuration settings
│
├── data/
│   ├── __init__.py
│   ├── fastf1_loader.py  # FastF1 data utilities
│   └── jolpica_client.py # Historical API client
│
├── modules/
│   ├── __init__.py
│   ├── telemetry_comparison.py  # Module 1
│   ├── lap_analysis.py          # Module 2
│   ├── weather_analysis.py      # Module 3
│   ├── strategy_analysis.py     # Module 4
│   └── segment_analysis.py      # Module 5
│
└── cache/                # FastF1 data cache (auto-created)
```

## ⚙️ Configuration

Key settings can be modified in `config/settings.py`:

- `CURRENT_SEASON`: Default season for analysis
- `AVAILABLE_SEASONS`: Supported seasons range
- `TIRE_COMPOUNDS`: Tire colors and abbreviations
- `TEAM_COLORS`: Official team colors
- `DEFAULT_LAP_THRESHOLD`: Minimum laps for analysis

## 📝 Usage Tips

1. **First Load Patience**: Initial session loads download data from FastF1 and may take 1-2 minutes. Data is cached locally for subsequent use.

2. **Memory Management**: For memory-constrained systems, analyze one session at a time.

3. **Data Availability**: 
   - FastF1 data is available from 2018+
   - Jolpica historical data extends back to 1950

4. **Segment Analysis**: Use the track length shown after loading to select meaningful segment boundaries.

## 🔧 Troubleshooting

**"Error loading session"**
- Ensure you have internet connectivity
- Try a more recent race (data availability varies)
- Check FastF1 cache directory permissions

**Slow performance**
- Clear the cache folder periodically
- Reduce the number of drivers/laps in analysis

**Missing telemetry data**
- Some older sessions have limited telemetry
- Practice sessions may have incomplete data

## 📄 License

This project is for educational and analytical purposes. F1 data is provided by FastF1 and Jolpica APIs.

## 🙏 Acknowledgments

- [FastF1](https://github.com/theOehrly/Fast-F1) - F1 telemetry data
- [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) - Historical F1 data
- Formula 1 - The sport we love

---

**Built with ❤️ for the F1 community**
