"""
Apex Analyst: F1 Race Strategy & Performance Analytics Platform
Main Streamlit Application Entry Point
"""

import streamlit as st
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import APP_NAME, APP_SUBTITLE, VERSION
from modules.telemetry_comparison import render_telemetry_comparison
from modules.lap_analysis import render_lap_analysis
from modules.weather_analysis import render_weather_analysis
from modules.strategy_analysis import render_strategy_analysis
from modules.segment_analysis import render_segment_analysis


# Page Configuration
st.set_page_config(
    page_title=f"{APP_NAME} - F1 Analytics",
    page_icon="🏎️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    /* Main header styling */
    .main-header {
        background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
    }
    
    .main-header h1 {
        color: #e94560;
        margin: 0;
        font-size: 2.5rem;
    }
    
    .main-header p {
        color: #a0a0a0;
        margin: 10px 0 0 0;
    }
    
    /* Sidebar styling */
    .css-1d391kg {
        background: linear-gradient(180deg, #1a1a2e, #16213e);
    }
    
    /* Card styling */
    .metric-card {
        background: linear-gradient(135deg, #1e3a5f, #2d4a6f);
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        margin: 10px 0;
    }
    
    /* Module selector styling */
    .module-button {
        background: linear-gradient(135deg, #e94560, #ff6b6b);
        color: white;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        margin: 5px 0;
        transition: transform 0.2s;
    }
    
    .module-button:hover {
        transform: scale(1.02);
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Improve chart containers */
    .plot-container {
        border-radius: 10px;
        overflow: hidden;
    }
</style>
""", unsafe_allow_html=True)


def render_sidebar():
    """Render the sidebar navigation"""
    
    with st.sidebar:
        # Logo/Header
        st.markdown("""
        <div style='text-align: center; padding: 20px 0;'>
            <h1 style='color: #e94560; font-size: 1.8rem; margin: 0;'>🏎️ APEX</h1>
            <h2 style='color: #ffffff; font-size: 1.2rem; margin: 0;'>ANALYST</h2>
            <p style='color: #888; font-size: 0.8rem; margin-top: 5px;'>v{}</p>
        </div>
        """.format(VERSION), unsafe_allow_html=True)
        
        st.divider()
        
        # Navigation
        st.markdown("### 📊 Analysis Modules")
        
        module = st.radio(
            "Select Module",
            options=[
                "🏠 Home",
                "🏎️ Driver Telemetry",
                "⏱️ Lap Analysis",
                "🌧️ Weather Impact",
                "🏁 Strategy Planner",
                "🔍 Segment Analysis"
            ],
            label_visibility="collapsed"
        )
        
        st.divider()
        
        # Quick Info
        st.markdown("### ℹ️ Quick Info")
        st.info("""
        **Data Sources:**
        - FastF1 (Live/Recent)
        - Jolpica API (Historical)
        
        **Tip:** First session load may take 1-2 minutes to cache data.
        """)
        
        st.divider()
        
        # Credits
        st.markdown("""
        <div style='text-align: center; color: #666; font-size: 0.75rem;'>
            Built with ❤️ using<br>
            Streamlit • FastF1 • Plotly
        </div>
        """, unsafe_allow_html=True)
        
        return module


def render_home():
    """Render the home page"""
    
    # Header
    st.markdown("""
    <div class='main-header'>
        <h1>🏎️ APEX ANALYST</h1>
        <p>Real-Time F1 Strategy and Driver Performance Analytics</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Welcome message
    st.markdown("""
    Welcome to **Apex Analyst**, your comprehensive F1 data analytics platform. 
    This tool provides deep insights for race strategists, performance engineers, 
    and driver coaches using real-time and historical F1 data.
    """)
    
    st.divider()
    
    # Module Overview
    st.subheader("📊 Available Analysis Modules")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div style='background: linear-gradient(135deg, #3671C640, #3671C620); 
                    padding: 20px; border-radius: 10px; margin: 10px 0;
                    border-left: 4px solid #3671C6;'>
            <h3 style='margin: 0; color: #3671C6;'>🏎️ Driver Telemetry</h3>
            <p style='margin: 10px 0 0 0;'>
                Compare two drivers through corners with trajectory plots, 
                speed traces, throttle/brake overlays, and key performance metrics.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div style='background: linear-gradient(135deg, #E8002040, #E8002020); 
                    padding: 20px; border-radius: 10px; margin: 10px 0;
                    border-left: 4px solid #E80020;'>
            <h3 style='margin: 0; color: #E80020;'>⏱️ Lap Analysis</h3>
            <p style='margin: 10px 0 0 0;'>
                Decompose lap times into sectors, compare theoretical vs actual best,
                and analyze tire degradation rates across compounds.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div style='background: linear-gradient(135deg, #27F4D240, #27F4D220); 
                    padding: 20px; border-radius: 10px; margin: 10px 0;
                    border-left: 4px solid #27F4D2;'>
            <h3 style='margin: 0; color: #27F4D2;'>🌧️ Weather Impact</h3>
            <p style='margin: 10px 0 0 0;'>
                Correlate track conditions with performance. Quantify the impact 
                of temperature, humidity, and weather changes on lap times.
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div style='background: linear-gradient(135deg, #FF800040, #FF800020); 
                    padding: 20px; border-radius: 10px; margin: 10px 0;
                    border-left: 4px solid #FF8000;'>
            <h3 style='margin: 0; color: #FF8000;'>🏁 Strategy Planner</h3>
            <p style='margin: 10px 0 0 0;'>
                Analyze historical race strategies, pit stop timing, and 
                calculate strategy efficiency for optimal race planning.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div style='background: linear-gradient(135deg, #22997140, #22997120); 
                    padding: 20px; border-radius: 10px; margin: 10px 0;
                    border-left: 4px solid #229971;'>
            <h3 style='margin: 0; color: #229971;'>🔍 Segment Analysis</h3>
            <p style='margin: 10px 0 0 0;'>
                Define track segments and discover which drivers excel through 
                specific corners with speed leaderboards and performance distributions.
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    st.divider()
    
    # Getting Started
    st.subheader("🚀 Getting Started")
    
    st.markdown("""
    1. **Select a Module** from the sidebar navigation
    2. **Choose Session Parameters** (Year, Event, Session Type)
    3. **Load the Session** - first load may take 1-2 minutes to cache
    4. **Configure Analysis Options** and run your analysis
    5. **Explore Interactive Visualizations** with zoom, hover, and export features
    """)
    
    # Data freshness indicator
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("📅 Latest Season", "2024", help="Most recent season available")
    
    with col2:
        st.metric("📊 Data Types", "5", help="Telemetry, Laps, Weather, Pit Stops, Strategy")
    
    with col3:
        st.metric("🔄 Cache Status", "Active", help="Data is cached locally for faster access")


def main():
    """Main application entry point"""
    
    # Initialize session state
    if 'initialized' not in st.session_state:
        st.session_state['initialized'] = True
    
    # Render sidebar and get selected module
    selected_module = render_sidebar()
    
    # Route to appropriate module
    if selected_module == "🏠 Home":
        render_home()
    
    elif selected_module == "🏎️ Driver Telemetry":
        render_telemetry_comparison()
    
    elif selected_module == "⏱️ Lap Analysis":
        render_lap_analysis()
    
    elif selected_module == "🌧️ Weather Impact":
        render_weather_analysis()
    
    elif selected_module == "🏁 Strategy Planner":
        render_strategy_analysis()
    
    elif selected_module == "🔍 Segment Analysis":
        render_segment_analysis()


if __name__ == "__main__":
    main()
