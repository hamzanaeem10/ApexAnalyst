"""
Module 1: Driver Telemetry Comparison (The Teammate Duel)
Compare telemetry data between two drivers for detailed performance analysis
"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Tuple, Optional, Dict
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from data.fastf1_loader import (
    load_session, get_laps_data, get_telemetry_data,
    get_driver_info, get_driver_color, filter_telemetry_by_distance,
    get_all_driver_abbreviations
)
from config.settings import TIRE_COMPOUNDS


def render_telemetry_comparison():
    """Main render function for the telemetry comparison module"""
    
    st.header("🏎️ Driver Telemetry Comparison")
    st.markdown("*The Teammate Duel - Compare driver performances through corners and segments*")
    
    # Session Selection
    col1, col2, col3 = st.columns(3)
    
    with col1:
        year = st.selectbox("Season", options=list(range(2024, 2017, -1)), key="telem_year")
    
    with col2:
        # Get available events
        try:
            import fastf1
            schedule = fastf1.get_event_schedule(year)
            events = schedule[schedule['EventFormat'] != 'testing']['EventName'].tolist()
            event = st.selectbox("Event", options=events, key="telem_event")
        except Exception as e:
            st.error(f"Error loading events: {e}")
            return
    
    with col3:
        session_type = st.selectbox(
            "Session",
            options=["Q", "R", "FP1", "FP2", "FP3", "S", "SQ"],
            format_func=lambda x: {
                "Q": "Qualifying", "R": "Race", "FP1": "FP1",
                "FP2": "FP2", "FP3": "FP3", "S": "Sprint", "SQ": "Sprint Quali"
            }.get(x, x),
            key="telem_session"
        )
    
    # Load Session Button
    if st.button("Load Session Data", key="load_telem_session"):
        with st.spinner("Loading session data... This may take a moment."):
            try:
                session = load_session(year, event, session_type)
                st.session_state['telem_session_data'] = session
                st.session_state['telem_data_loaded'] = True
                st.success("Session loaded successfully!")
            except Exception as e:
                st.error(f"Error loading session: {e}")
                return
    
    # Only show comparison options if session is loaded
    if not st.session_state.get('telem_data_loaded', False):
        st.info("👆 Select a session and click 'Load Session Data' to begin analysis")
        return
    
    session = st.session_state['telem_session_data']
    
    st.divider()
    
    # Driver Selection
    st.subheader("Select Drivers to Compare")
    
    drivers = get_all_driver_abbreviations(session)
    driver_info = get_driver_info(session)
    
    col1, col2 = st.columns(2)
    
    with col1:
        driver1 = st.selectbox(
            "Driver 1",
            options=drivers,
            format_func=lambda x: f"{x} - {driver_info[driver_info['Abbreviation']==x]['TeamName'].values[0] if len(driver_info[driver_info['Abbreviation']==x]) > 0 else 'Unknown'}",
            key="driver1_select"
        )
    
    with col2:
        driver2 = st.selectbox(
            "Driver 2",
            options=[d for d in drivers if d != driver1],
            format_func=lambda x: f"{x} - {driver_info[driver_info['Abbreviation']==x]['TeamName'].values[0] if len(driver_info[driver_info['Abbreviation']==x]) > 0 else 'Unknown'}",
            key="driver2_select"
        )
    
    # Lap Selection
    st.subheader("Select Laps to Compare")
    
    laps1 = get_laps_data(session, driver1)
    laps2 = get_laps_data(session, driver2)
    
    # Filter to valid laps
    valid_laps1 = laps1[laps1['LapTime'].notna()]['LapNumber'].tolist()
    valid_laps2 = laps2[laps2['LapTime'].notna()]['LapNumber'].tolist()
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Find fastest lap for default
        fastest_lap1 = laps1[laps1['LapTime'] == laps1['LapTime'].min()]['LapNumber'].values
        default_lap1 = int(fastest_lap1[0]) if len(fastest_lap1) > 0 else valid_laps1[0] if valid_laps1 else 1
        
        lap1_num = st.selectbox(
            f"Lap for {driver1}",
            options=valid_laps1,
            index=valid_laps1.index(default_lap1) if default_lap1 in valid_laps1 else 0,
            key="lap1_select"
        )
    
    with col2:
        fastest_lap2 = laps2[laps2['LapTime'] == laps2['LapTime'].min()]['LapNumber'].values
        default_lap2 = int(fastest_lap2[0]) if len(fastest_lap2) > 0 else valid_laps2[0] if valid_laps2 else 1
        
        lap2_num = st.selectbox(
            f"Lap for {driver2}",
            options=valid_laps2,
            index=valid_laps2.index(default_lap2) if default_lap2 in valid_laps2 else 0,
            key="lap2_select"
        )
    
    # Segment Selection
    st.subheader("Select Track Segment (Optional)")
    
    use_segment = st.checkbox("Analyze specific segment only", key="use_segment")
    
    if use_segment:
        col1, col2 = st.columns(2)
        with col1:
            start_dist = st.number_input("Start Distance (m)", value=0, min_value=0, key="start_dist")
        with col2:
            end_dist = st.number_input("End Distance (m)", value=500, min_value=0, key="end_dist")
    else:
        start_dist = None
        end_dist = None
    
    # Run Analysis Button
    if st.button("🔍 Run Telemetry Analysis", type="primary", key="run_telem_analysis"):
        with st.spinner("Analyzing telemetry data..."):
            try:
                # Get lap data
                lap1 = laps1[laps1['LapNumber'] == lap1_num].iloc[0]
                lap2 = laps2[laps2['LapNumber'] == lap2_num].iloc[0]
                
                # Get telemetry
                tel1 = get_telemetry_data(lap1)
                tel2 = get_telemetry_data(lap2)
                
                # Filter by segment if specified
                if use_segment and start_dist is not None and end_dist is not None:
                    tel1 = filter_telemetry_by_distance(tel1, start_dist, end_dist)
                    tel2 = filter_telemetry_by_distance(tel2, start_dist, end_dist)
                
                # Get colors
                color1 = get_driver_color(session, driver1)
                color2 = get_driver_color(session, driver2)
                
                # Display results
                display_telemetry_analysis(
                    tel1, tel2, driver1, driver2, 
                    color1, color2, lap1, lap2,
                    session
                )
                
            except Exception as e:
                st.error(f"Error analyzing telemetry: {e}")
                import traceback
                st.code(traceback.format_exc())


def display_telemetry_analysis(tel1: pd.DataFrame, tel2: pd.DataFrame,
                               driver1: str, driver2: str,
                               color1: str, color2: str,
                               lap1: pd.Series, lap2: pd.Series,
                               session) -> None:
    """Display the telemetry analysis visualizations and metrics"""
    
    st.divider()
    st.subheader("📊 Analysis Results")
    
    # Key Stats Cards
    display_stat_cards(tel1, tel2, driver1, driver2, color1, color2, lap1, lap2)
    
    st.divider()
    
    # Trajectory Plot
    st.subheader("🗺️ Racing Line Comparison")
    plot_trajectory_comparison(tel1, tel2, driver1, driver2, color1, color2)
    
    st.divider()
    
    # Telemetry Overlays
    st.subheader("📈 Telemetry Overlays")
    plot_telemetry_overlays(tel1, tel2, driver1, driver2, color1, color2)


def display_stat_cards(tel1: pd.DataFrame, tel2: pd.DataFrame,
                       driver1: str, driver2: str,
                       color1: str, color2: str,
                       lap1: pd.Series, lap2: pd.Series) -> None:
    """Display key statistics as metric cards"""
    
    # Calculate stats
    min_speed1 = tel1['Speed'].min() if 'Speed' in tel1.columns else 0
    max_speed1 = tel1['Speed'].max() if 'Speed' in tel1.columns else 0
    min_speed2 = tel2['Speed'].min() if 'Speed' in tel2.columns else 0
    max_speed2 = tel2['Speed'].max() if 'Speed' in tel2.columns else 0
    
    # Get lap times
    lap_time1 = lap1['LapTime'].total_seconds() if pd.notna(lap1['LapTime']) else 0
    lap_time2 = lap2['LapTime'].total_seconds() if pd.notna(lap2['LapTime']) else 0
    
    # Display in columns
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"### {driver1}")
        st.markdown(f"<div style='background: linear-gradient(90deg, {color1}40, transparent); padding: 10px; border-radius: 5px; border-left: 4px solid {color1};'>", unsafe_allow_html=True)
        
        c1, c2, c3 = st.columns(3)
        with c1:
            st.metric("Min Speed", f"{min_speed1:.1f} km/h")
        with c2:
            st.metric("Max Speed", f"{max_speed1:.1f} km/h")
        with c3:
            st.metric("Lap Time", f"{lap_time1:.3f}s")
        st.markdown("</div>", unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"### {driver2}")
        st.markdown(f"<div style='background: linear-gradient(90deg, {color2}40, transparent); padding: 10px; border-radius: 5px; border-left: 4px solid {color2};'>", unsafe_allow_html=True)
        
        c1, c2, c3 = st.columns(3)
        with c1:
            delta_min = min_speed2 - min_speed1
            st.metric("Min Speed", f"{min_speed2:.1f} km/h", f"{delta_min:+.1f}")
        with c2:
            delta_max = max_speed2 - max_speed1
            st.metric("Max Speed", f"{max_speed2:.1f} km/h", f"{delta_max:+.1f}")
        with c3:
            delta_time = lap_time2 - lap_time1
            st.metric("Lap Time", f"{lap_time2:.3f}s", f"{delta_time:+.3f}s", delta_color="inverse")
        st.markdown("</div>", unsafe_allow_html=True)


def plot_trajectory_comparison(tel1: pd.DataFrame, tel2: pd.DataFrame,
                                driver1: str, driver2: str,
                                color1: str, color2: str) -> None:
    """Plot the racing line trajectory comparison"""
    
    if 'X' not in tel1.columns or 'Y' not in tel1.columns:
        st.warning("Position data not available for trajectory plot")
        return
    
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Plot driver trajectories
    ax.plot(tel1['X'], tel1['Y'], color=color1, linewidth=2, label=driver1, alpha=0.8)
    ax.plot(tel2['X'], tel2['Y'], color=color2, linewidth=2, label=driver2, alpha=0.8, linestyle='--')
    
    # Style the plot
    ax.set_xlabel('X Position (m)')
    ax.set_ylabel('Y Position (m)')
    ax.set_title('Racing Line Comparison')
    ax.legend(loc='upper right')
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    
    # Dark theme
    ax.set_facecolor('#1a1a1a')
    fig.patch.set_facecolor('#0e1117')
    ax.tick_params(colors='white')
    ax.xaxis.label.set_color('white')
    ax.yaxis.label.set_color('white')
    ax.title.set_color('white')
    for spine in ax.spines.values():
        spine.set_color('white')
    ax.legend(facecolor='#1a1a1a', edgecolor='white', labelcolor='white')
    ax.grid(True, alpha=0.2, color='white')
    
    st.pyplot(fig)
    plt.close()


def plot_telemetry_overlays(tel1: pd.DataFrame, tel2: pd.DataFrame,
                            driver1: str, driver2: str,
                            color1: str, color2: str) -> None:
    """Plot telemetry overlay charts using Plotly"""
    
    # Create subplots
    fig = make_subplots(
        rows=4, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.05,
        subplot_titles=('Speed (km/h)', 'Throttle (%)', 'Brake (%)', 'Steering Angle (deg)')
    )
    
    distance1 = tel1['Distance'] if 'Distance' in tel1.columns else tel1.index
    distance2 = tel2['Distance'] if 'Distance' in tel2.columns else tel2.index
    
    # Speed
    if 'Speed' in tel1.columns:
        fig.add_trace(go.Scatter(x=distance1, y=tel1['Speed'], name=driver1, 
                                  line=dict(color=color1, width=2)), row=1, col=1)
        fig.add_trace(go.Scatter(x=distance2, y=tel2['Speed'], name=driver2,
                                  line=dict(color=color2, width=2, dash='dash')), row=1, col=1)
    
    # Throttle
    if 'Throttle' in tel1.columns:
        fig.add_trace(go.Scatter(x=distance1, y=tel1['Throttle'], name=driver1,
                                  line=dict(color=color1, width=2), showlegend=False), row=2, col=1)
        fig.add_trace(go.Scatter(x=distance2, y=tel2['Throttle'], name=driver2,
                                  line=dict(color=color2, width=2, dash='dash'), showlegend=False), row=2, col=1)
    
    # Brake
    if 'Brake' in tel1.columns:
        fig.add_trace(go.Scatter(x=distance1, y=tel1['Brake'], name=driver1,
                                  line=dict(color=color1, width=2), showlegend=False), row=3, col=1)
        fig.add_trace(go.Scatter(x=distance2, y=tel2['Brake'], name=driver2,
                                  line=dict(color=color2, width=2, dash='dash'), showlegend=False), row=3, col=1)
    
    # Steering (nGear used as proxy if Steering not available)
    steering_col = 'Steering' if 'Steering' in tel1.columns else None
    if steering_col is None and 'nGear' in tel1.columns:
        steering_col = 'nGear'
        fig.layout.annotations[3].text = 'Gear'
    
    if steering_col and steering_col in tel1.columns:
        fig.add_trace(go.Scatter(x=distance1, y=tel1[steering_col], name=driver1,
                                  line=dict(color=color1, width=2), showlegend=False), row=4, col=1)
        fig.add_trace(go.Scatter(x=distance2, y=tel2[steering_col], name=driver2,
                                  line=dict(color=color2, width=2, dash='dash'), showlegend=False), row=4, col=1)
    
    # Update layout
    fig.update_layout(
        height=800,
        title_text="Telemetry Comparison",
        template="plotly_dark",
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    fig.update_xaxes(title_text="Distance (m)", row=4, col=1)
    
    st.plotly_chart(fig, use_container_width=True)


# Module entry point
if __name__ == "__main__":
    render_telemetry_comparison()
