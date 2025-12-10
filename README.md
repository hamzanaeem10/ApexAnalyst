# Apex Analyst: F1 Race Strategy & Performance Analytics Platform

🏎️ A comprehensive, data-driven F1 analytics platform for race strategists, performance engineers, and driver coaches.

![Apex Analyst](https://img.shields.io/badge/F1-Analytics-E10600?style=for-the-badge&logo=f1&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

## 🎯 Overview

Apex Analyst integrates FastF1 and jolpica-f1 data to provide actionable insights across five key analytical modules:

1. **Driver Telemetry Comparison** - Compare two drivers through corners
2. **Lap Time Analysis** - Decompose lap times and analyze tire degradation
3. **Weather Correlation** - Understand track condition impacts
4. **Historical Strategy Analysis** - Learn from past race strategies
5. **Circuit Segment Analysis** - Identify performance through specific track sections

## 🛠️ Architecture

This project now features a modern two-tier architecture:

- **Backend**: FastAPI with Pydantic v2 for strict data contracts
- **Frontend**: React with TypeScript, TanStack Query, and Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

API available at `http://localhost:8000` (Swagger docs at `/docs`)

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend available at `http://localhost:3000`

### Legacy Streamlit Version

The original Streamlit app is still available:

```bash
pip install -r requirements.txt
streamlit run app.py
```

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
-  - Lap time vs track temperature correlation
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

## 🚀 Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set the **Root Directory** to `frontend`
4. Add environment variable: `VITE_API_URL` = your backend URL (e.g., `https://apexanalyst-api.railway.app`)
5. Deploy!

### Backend (Railway)

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository
3. Set the **Root Directory** to `backend`
4. Railway will auto-detect the Python app
5. Add environment variables if needed:
   - `DEBUG=false`
   - `CORS_ORIGINS=https://your-app.vercel.app`
6. Deploy!

### Alternative: Backend on Render

1. Go to [render.com](https://render.com) and create a new Web Service
2. Connect your GitHub repository
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy!

### Post-Deployment

1. Copy your backend URL (e.g., `https://apexanalyst-api.railway.app`)
2. Update `frontend/vercel.json` with the backend URL in the rewrites section
3. Or set `VITE_API_URL` environment variable in Vercel dashboard

## 🙏 Acknowledgments

- [FastF1](https://github.com/theOehrly/Fast-F1) - F1 telemetry data
- [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) - Historical F1 data
- Formula 1 - The sport we love

---

**Built with ❤️ for the F1 community**
