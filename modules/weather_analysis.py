"""
Module 3: Weather and Condition Correlation Study (The Rain Impact)
Analyze the impact of weather and track conditions on lap times
"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy import stats
from typing import Tuple, Optional, Dict, List
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from data.fastf1_loader import (
    load_session, get_laps_data, get_weather_data,
    get_driver_info, get_all_driver_abbreviations
)
from config.settings import DEFAULT_ROLLING_WINDOW, DEFAULT_LAP_THRESHOLD


def render_weather_analysis():
    """Main render function for weather correlation analysis"""
    
    st.header("🌧️ Weather & Condition Correlation Study")
    st.markdown("*The Rain Impact - Understand how conditions affect performance*")
    
    # Session Selection
    col1, col2, col3 = st.columns(3)
    
    with col1:
        year = st.selectbox("Season", options=list(range(2024, 2017, -1)), key="weather_year")
    
    with col2:
        try:
            import fastf1
            schedule = fastf1.get_event_schedule(year)
            events = schedule[schedule['EventFormat'] != 'testing']['EventName'].tolist()
            event = st.selectbox("Event", options=events, key="weather_event")
        except Exception as e:
            st.error(f"Error loading events: {e}")
            return
    
    with col3:
        session_type = st.selectbox(
            "Session",
            options=["R", "Q", "S", "FP1", "FP2", "FP3"],
            format_func=lambda x: {
                "R": "Race", "Q": "Qualifying", "S": "Sprint",
                "FP1": "FP1", "FP2": "FP2", "FP3": "FP3"
            }.get(x, x),
            key="weather_session"
        )
    
    # Load Session
    if st.button("Load Session Data", key="load_weather_session"):
        with st.spinner("Loading session data..."):
            try:
                session = load_session(year, event, session_type)
                st.session_state['weather_session_data'] = session
                st.session_state['weather_data_loaded'] = True
                st.success("Session loaded successfully!")
            except Exception as e:
                st.error(f"Error loading session: {e}")
                return
    
    if not st.session_state.get('weather_data_loaded', False):
        st.info("👆 Select a session and click 'Load Session Data' to begin analysis")
        return
    
    session = st.session_state['weather_session_data']
    
    st.divider()
    
    # Analysis Parameters
    st.subheader("Analysis Parameters")
    
    col1, col2 = st.columns(2)
    
    with col1:
        min_lap_threshold = st.slider(
            "Minimum Lap Threshold",
            min_value=1, max_value=20, value=DEFAULT_LAP_THRESHOLD,
            help="Minimum number of laps to include in analysis",
            key="min_lap_threshold"
        )
    
    with col2:
        rolling_window = st.slider(
            "Rolling Average Window (laps)",
            min_value=3, max_value=10, value=DEFAULT_ROLLING_WINDOW,
            help="Number of laps for rolling average calculation",
            key="rolling_window"
        )
    
    if st.button("🔍 Analyze Weather Impact", type="primary", key="run_weather_analysis"):
        with st.spinner("Analyzing weather correlation..."):
            try:
                all_laps = session.laps
                weather = get_weather_data(session)
                
                display_weather_analysis(
                    all_laps, weather, session,
                    min_lap_threshold, rolling_window
                )
            except Exception as e:
                st.error(f"Error analyzing weather data: {e}")
                import traceback
                st.code(traceback.format_exc())


def display_weather_analysis(all_laps: pd.DataFrame, weather: pd.DataFrame,
                              session, min_lap_threshold: int,
                              rolling_window: int) -> None:
    """Display weather correlation analysis"""
    
    st.divider()
    
    # 1. Weather Overview
    st.subheader("🌡️ Session Weather Overview")
    display_weather_overview(weather)
    
    st.divider()
    
    # 2. Temperature Evolution
    st.subheader("📈 Temperature Evolution")
    display_temperature_evolution(weather)
    
    st.divider()
    
    # 3. Lap Time vs Track Temperature Correlation
    st.subheader("🔬 Track Temperature vs Lap Time Correlation")
    display_temperature_correlation(all_laps, weather, rolling_window)
    
    st.divider()
    
    # 4. Quantified Impact
    st.subheader("📊 Quantified Weather Impact")
    display_quantified_impact(all_laps, weather, rolling_window)


def display_weather_overview(weather: pd.DataFrame) -> None:
    """Display weather statistics overview"""
    
    if weather.empty:
        st.warning("No weather data available")
        return
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if 'AirTemp' in weather.columns:
            avg_air = weather['AirTemp'].mean()
            min_air = weather['AirTemp'].min()
            max_air = weather['AirTemp'].max()
            st.metric("🌡️ Air Temp", f"{avg_air:.1f}°C", f"{min_air:.1f} - {max_air:.1f}°C")
    
    with col2:
        if 'TrackTemp' in weather.columns:
            avg_track = weather['TrackTemp'].mean()
            min_track = weather['TrackTemp'].min()
            max_track = weather['TrackTemp'].max()
            st.metric("🛣️ Track Temp", f"{avg_track:.1f}°C", f"{min_track:.1f} - {max_track:.1f}°C")
    
    with col3:
        if 'Humidity' in weather.columns:
            avg_humidity = weather['Humidity'].mean()
            st.metric("💧 Humidity", f"{avg_humidity:.1f}%")
    
    with col4:
        if 'WindSpeed' in weather.columns:
            avg_wind = weather['WindSpeed'].mean()
            st.metric("💨 Wind Speed", f"{avg_wind:.1f} m/s")
    
    # Rainfall indicator
    if 'Rainfall' in weather.columns:
        rainfall = weather['Rainfall'].any()
        if rainfall:
            st.warning("🌧️ **Rainfall detected during session**")
        else:
            st.success("☀️ **Dry session - no rainfall detected**")


def display_temperature_evolution(weather: pd.DataFrame) -> None:
    """Display temperature evolution over session time"""
    
    if weather.empty or 'Time' not in weather.columns:
        st.warning("Insufficient weather data for evolution plot")
        return
    
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    
    # Convert time to minutes from session start
    time_minutes = weather['Time'].dt.total_seconds() / 60
    
    # Air Temperature
    if 'AirTemp' in weather.columns:
        fig.add_trace(
            go.Scatter(
                x=time_minutes, y=weather['AirTemp'],
                name="Air Temperature",
                line=dict(color='#00CED1', width=2)
            ),
            secondary_y=False
        )
    
    # Track Temperature
    if 'TrackTemp' in weather.columns:
        fig.add_trace(
            go.Scatter(
                x=time_minutes, y=weather['TrackTemp'],
                name="Track Temperature",
                line=dict(color='#FF6347', width=2)
            ),
            secondary_y=False
        )
    
    # Humidity on secondary axis
    if 'Humidity' in weather.columns:
        fig.add_trace(
            go.Scatter(
                x=time_minutes, y=weather['Humidity'],
                name="Humidity",
                line=dict(color='#90EE90', width=2, dash='dash'),
                opacity=0.7
            ),
            secondary_y=True
        )
    
    fig.update_layout(
        title="Temperature & Humidity Evolution",
        xaxis_title="Session Time (minutes)",
        template="plotly_dark",
        height=400,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    fig.update_yaxes(title_text="Temperature (°C)", secondary_y=False)
    fig.update_yaxes(title_text="Humidity (%)", secondary_y=True)
    
    st.plotly_chart(fig, use_container_width=True)


def display_temperature_correlation(all_laps: pd.DataFrame, weather: pd.DataFrame,
                                     rolling_window: int) -> None:
    """Display scatter plot of lap time vs track temperature"""
    
    if weather.empty or 'TrackTemp' not in weather.columns:
        st.warning("Track temperature data not available")
        return
    
    # Filter valid laps
    valid_laps = all_laps[all_laps['LapTime'].notna() & all_laps['IsAccurate']].copy()
    
    if valid_laps.empty:
        st.warning("No valid laps for correlation analysis")
        return
    
    # Convert lap times to seconds
    valid_laps['LapTimeSeconds'] = valid_laps['LapTime'].dt.total_seconds()
    
    # Merge with weather data (approximate by time)
    # For each lap, find the closest weather reading
    correlation_data = []
    
    for _, lap in valid_laps.iterrows():
        lap_time = lap.get('Time', lap.get('LapStartTime'))
        if pd.isna(lap_time):
            continue
        
        # Find closest weather reading
        time_diffs = abs(weather['Time'] - lap_time)
        closest_idx = time_diffs.idxmin()
        closest_weather = weather.loc[closest_idx]
        
        correlation_data.append({
            'LapTime': lap['LapTimeSeconds'],
            'TrackTemp': closest_weather['TrackTemp'],
            'AirTemp': closest_weather.get('AirTemp', np.nan),
            'Driver': lap['Driver'],
            'LapNumber': lap['LapNumber'],
            'Compound': lap.get('Compound', 'Unknown')
        })
    
    if not correlation_data:
        st.warning("Could not correlate laps with weather data")
        return
    
    corr_df = pd.DataFrame(correlation_data)
    
    # Create rolling average groups (5-lap windows)
    corr_df = corr_df.sort_values('TrackTemp')
    corr_df['TempBin'] = pd.cut(corr_df['TrackTemp'], bins=10)
    
    # Calculate averages per temperature bin
    bin_averages = corr_df.groupby('TempBin').agg({
        'LapTime': 'mean',
        'TrackTemp': 'mean'
    }).dropna().reset_index()
    
    # Scatter plot with trend line
    fig = px.scatter(
        corr_df,
        x='TrackTemp',
        y='LapTime',
        color='Compound',
        hover_data=['Driver', 'LapNumber'],
        title="Lap Time vs Track Temperature",
        labels={'TrackTemp': 'Track Temperature (°C)', 'LapTime': 'Lap Time (seconds)'},
        template="plotly_dark",
        opacity=0.6
    )
    
    # Add trend line
    if len(corr_df) > 2:
        slope, intercept, r_value, p_value, std_err = stats.linregress(
            corr_df['TrackTemp'], corr_df['LapTime']
        )
        
        x_trend = np.linspace(corr_df['TrackTemp'].min(), corr_df['TrackTemp'].max(), 100)
        y_trend = slope * x_trend + intercept
        
        fig.add_trace(go.Scatter(
            x=x_trend, y=y_trend,
            mode='lines',
            name=f'Trend (R² = {r_value**2:.3f})',
            line=dict(color='white', width=2, dash='dash')
        ))
    
    fig.update_layout(height=500)
    
    st.plotly_chart(fig, use_container_width=True)


def display_quantified_impact(all_laps: pd.DataFrame, weather: pd.DataFrame,
                               rolling_window: int) -> None:
    """Display quantified weather impact metrics"""
    
    if weather.empty or 'TrackTemp' not in weather.columns:
        st.warning("Track temperature data not available for quantification")
        return
    
    # Filter valid laps
    valid_laps = all_laps[all_laps['LapTime'].notna() & all_laps['IsAccurate']].copy()
    
    if valid_laps.empty:
        st.warning("No valid laps for impact quantification")
        return
    
    valid_laps['LapTimeSeconds'] = valid_laps['LapTime'].dt.total_seconds()
    
    # Build correlation data
    correlation_data = []
    
    for _, lap in valid_laps.iterrows():
        lap_time = lap.get('Time', lap.get('LapStartTime'))
        if pd.isna(lap_time):
            continue
        
        time_diffs = abs(weather['Time'] - lap_time)
        closest_idx = time_diffs.idxmin()
        closest_weather = weather.loc[closest_idx]
        
        correlation_data.append({
            'LapTime': lap['LapTimeSeconds'],
            'TrackTemp': closest_weather['TrackTemp'],
            'AirTemp': closest_weather.get('AirTemp', np.nan),
            'Humidity': closest_weather.get('Humidity', np.nan)
        })
    
    if not correlation_data:
        return
    
    corr_df = pd.DataFrame(correlation_data)
    
    # Calculate correlations
    metrics = {}
    
    # Track Temperature Impact
    if len(corr_df['TrackTemp'].dropna()) > 2:
        slope_track, _, r_track, _, _ = stats.linregress(
            corr_df['TrackTemp'].dropna(), 
            corr_df.loc[corr_df['TrackTemp'].notna(), 'LapTime']
        )
        metrics['Track Temp'] = {
            'delta_per_unit': slope_track,
            'unit': '°C',
            'r_squared': r_track ** 2,
            'direction': 'slower' if slope_track > 0 else 'faster'
        }
    
    # Air Temperature Impact
    if len(corr_df['AirTemp'].dropna()) > 2:
        valid_air = corr_df[corr_df['AirTemp'].notna()]
        slope_air, _, r_air, _, _ = stats.linregress(
            valid_air['AirTemp'], valid_air['LapTime']
        )
        metrics['Air Temp'] = {
            'delta_per_unit': slope_air,
            'unit': '°C',
            'r_squared': r_air ** 2,
            'direction': 'slower' if slope_air > 0 else 'faster'
        }
    
    # Humidity Impact
    if len(corr_df['Humidity'].dropna()) > 2:
        valid_humid = corr_df[corr_df['Humidity'].notna()]
        slope_humid, _, r_humid, _, _ = stats.linregress(
            valid_humid['Humidity'], valid_humid['LapTime']
        )
        metrics['Humidity'] = {
            'delta_per_unit': slope_humid,
            'unit': '%',
            'r_squared': r_humid ** 2,
            'direction': 'slower' if slope_humid > 0 else 'faster'
        }
    
    # Display metrics
    if not metrics:
        st.info("Insufficient data to calculate weather impact metrics")
        return
    
    cols = st.columns(len(metrics))
    
    for col, (name, data) in zip(cols, metrics.items()):
        with col:
            direction_emoji = "🔺" if data['direction'] == 'slower' else "🔻"
            
            st.markdown(f"""
            <div style='background: linear-gradient(135deg, #1e3a5f, #2d4a6f); 
                        padding: 20px; border-radius: 10px; text-align: center;'>
                <h4 style='margin: 0; color: #87CEEB;'>{name} Impact</h4>
            </div>
            """, unsafe_allow_html=True)
            
            delta_ms = abs(data['delta_per_unit']) * 1000
            
            st.metric(
                f"Delta per 1{data['unit']}",
                f"{direction_emoji} {abs(data['delta_per_unit']):.3f}s",
                f"({delta_ms:.1f} ms)",
                help=f"R² correlation: {data['r_squared']:.3f}"
            )
            
            st.caption(f"Correlation strength: {'Strong' if data['r_squared'] > 0.5 else 'Moderate' if data['r_squared'] > 0.2 else 'Weak'} (R²={data['r_squared']:.3f})")
    
    # Summary insight
    st.divider()
    
    if 'Track Temp' in metrics:
        track_impact = metrics['Track Temp']
        temp_range = weather['TrackTemp'].max() - weather['TrackTemp'].min()
        total_impact = abs(track_impact['delta_per_unit']) * temp_range
        
        st.info(f"""
        📊 **Key Insight:** Track temperature varied by **{temp_range:.1f}°C** during this session,
        which corresponds to an estimated lap time variation of **{total_impact:.3f}s** due to temperature alone.
        
        💡 For every **1°C** increase in track temperature, lap times are approximately 
        **{abs(track_impact['delta_per_unit'])*1000:.1f}ms {track_impact['direction']}**.
        """)


# Module entry point
if __name__ == "__main__":
    render_weather_analysis()
