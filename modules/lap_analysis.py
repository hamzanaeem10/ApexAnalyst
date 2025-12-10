"""
Module 2: Lap Time Decomposition and Performance Analysis (The Perfect Lap)
Analyze lap times, sector performance, and tire degradation
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
    load_session, get_laps_data, get_driver_info,
    get_driver_color, calculate_sector_times, calculate_theoretical_best,
    get_stint_data, calculate_tire_degradation, get_all_driver_abbreviations
)
from config.settings import TIRE_COMPOUNDS


def render_lap_analysis():
    """Main render function for lap time analysis module"""
    
    st.header("⏱️ Lap Time Decomposition & Performance Analysis")
    st.markdown("*The Perfect Lap - Discover where time is gained and lost*")
    
    # Session Selection
    col1, col2, col3 = st.columns(3)
    
    with col1:
        year = st.selectbox("Season", options=list(range(2024, 2017, -1)), key="lap_year")
    
    with col2:
        try:
            import fastf1
            schedule = fastf1.get_event_schedule(year)
            events = schedule[schedule['EventFormat'] != 'testing']['EventName'].tolist()
            event = st.selectbox("Event", options=events, key="lap_event")
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
            key="lap_session"
        )
    
    # Load Session
    if st.button("Load Session Data", key="load_lap_session"):
        with st.spinner("Loading session data..."):
            try:
                session = load_session(year, event, session_type)
                st.session_state['lap_session_data'] = session
                st.session_state['lap_data_loaded'] = True
                st.success("Session loaded successfully!")
            except Exception as e:
                st.error(f"Error loading session: {e}")
                return
    
    if not st.session_state.get('lap_data_loaded', False):
        st.info("👆 Select a session and click 'Load Session Data' to begin analysis")
        return
    
    session = st.session_state['lap_session_data']
    
    st.divider()
    
    # Driver Selection
    drivers = get_all_driver_abbreviations(session)
    driver_info = get_driver_info(session)
    
    selected_driver = st.selectbox(
        "Select Driver",
        options=drivers,
        format_func=lambda x: f"{x} - {driver_info[driver_info['Abbreviation']==x]['TeamName'].values[0] if len(driver_info[driver_info['Abbreviation']==x]) > 0 else 'Unknown'}",
        key="lap_driver_select"
    )
    
    if st.button("🔍 Analyze Performance", type="primary", key="run_lap_analysis"):
        with st.spinner("Analyzing lap data..."):
            try:
                driver_laps = get_laps_data(session, selected_driver)
                all_laps = session.laps
                
                color = get_driver_color(session, selected_driver)
                
                display_lap_analysis(
                    driver_laps, all_laps, selected_driver, color, session
                )
            except Exception as e:
                st.error(f"Error analyzing laps: {e}")
                import traceback
                st.code(traceback.format_exc())


def display_lap_analysis(driver_laps: pd.DataFrame, all_laps: pd.DataFrame,
                         driver: str, color: str, session) -> None:
    """Display the complete lap analysis"""
    
    st.divider()
    
    # 1. Theoretical vs Actual Lap Time
    st.subheader("🎯 Theoretical vs Actual Best Lap")
    display_theoretical_comparison(driver_laps, driver, color)
    
    st.divider()
    
    # 2. Sector Delta Chart
    st.subheader("📊 Sector Performance Delta")
    display_sector_delta_chart(driver_laps, all_laps, driver, color)
    
    st.divider()
    
    # 3. Performance Over Stint
    st.subheader("📈 Lap Time Evolution")
    display_stint_performance(driver_laps, driver, color)
    
    st.divider()
    
    # 4. Tire Degradation Analysis
    st.subheader("🛞 Tire Degradation Model")
    display_tire_degradation(driver_laps, driver, color)


def display_theoretical_comparison(driver_laps: pd.DataFrame, driver: str, color: str) -> None:
    """Display theoretical vs actual best lap comparison"""
    
    # Filter valid laps
    valid_laps = driver_laps[driver_laps['LapTime'].notna()].copy()
    
    if valid_laps.empty:
        st.warning("No valid laps available for analysis")
        return
    
    # Calculate times
    actual_best = valid_laps['LapTime'].min()
    theoretical_best = calculate_theoretical_best(valid_laps)
    
    # Convert to seconds for display
    actual_seconds = actual_best.total_seconds()
    theoretical_seconds = theoretical_best.total_seconds()
    delta = actual_seconds - theoretical_seconds
    
    # Get best sectors
    best_sectors = calculate_sector_times(valid_laps)
    
    # Display
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "🏆 Fastest Actual Lap",
            f"{actual_seconds:.3f}s",
            help="Best complete lap time achieved"
        )
    
    with col2:
        st.metric(
            "⚡ Theoretical Best",
            f"{theoretical_seconds:.3f}s",
            help="Sum of best individual sectors"
        )
    
    with col3:
        st.metric(
            "📉 Time Lost",
            f"+{delta:.3f}s",
            delta=f"{(delta/theoretical_seconds)*100:.2f}%",
            delta_color="inverse",
            help="Difference between actual and theoretical"
        )
    
    # Best Sector Breakdown
    st.markdown("**Best Sector Times:**")
    sec_col1, sec_col2, sec_col3 = st.columns(3)
    
    with sec_col1:
        s1_time = best_sectors['S1'].total_seconds() if pd.notna(best_sectors['S1']) else 0
        st.info(f"**Sector 1:** {s1_time:.3f}s")
    
    with sec_col2:
        s2_time = best_sectors['S2'].total_seconds() if pd.notna(best_sectors['S2']) else 0
        st.info(f"**Sector 2:** {s2_time:.3f}s")
    
    with sec_col3:
        s3_time = best_sectors['S3'].total_seconds() if pd.notna(best_sectors['S3']) else 0
        st.info(f"**Sector 3:** {s3_time:.3f}s")


def display_sector_delta_chart(driver_laps: pd.DataFrame, all_laps: pd.DataFrame,
                               driver: str, color: str) -> None:
    """Display sector time delta compared to session best"""
    
    # Calculate driver's best sectors
    driver_sectors = calculate_sector_times(driver_laps)
    
    # Calculate session best sectors
    valid_all_laps = all_laps[all_laps['LapTime'].notna()]
    session_sectors = {
        'S1': valid_all_laps['Sector1Time'].min(),
        'S2': valid_all_laps['Sector2Time'].min(),
        'S3': valid_all_laps['Sector3Time'].min()
    }
    
    # Calculate deltas
    deltas = []
    sectors = ['S1', 'S2', 'S3']
    
    for sector in sectors:
        if pd.notna(driver_sectors[sector]) and pd.notna(session_sectors[sector]):
            driver_time = driver_sectors[sector].total_seconds()
            session_time = session_sectors[sector].total_seconds()
            delta = driver_time - session_time
            deltas.append(delta)
        else:
            deltas.append(0)
    
    # Create bar chart
    fig = go.Figure()
    
    colors = [color if d <= 0 else '#FF6B6B' for d in deltas]
    
    fig.add_trace(go.Bar(
        x=sectors,
        y=deltas,
        marker_color=colors,
        text=[f"{d:+.3f}s" for d in deltas],
        textposition='outside'
    ))
    
    fig.update_layout(
        title=f"{driver} - Delta to Session Best Sectors",
        xaxis_title="Sector",
        yaxis_title="Delta (seconds)",
        template="plotly_dark",
        height=400,
        showlegend=False
    )
    
    # Add reference line at 0
    fig.add_hline(y=0, line_dash="dash", line_color="white", opacity=0.5)
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Summary
    total_delta = sum(deltas)
    if total_delta > 0:
        st.warning(f"📊 Total sector deficit: **+{total_delta:.3f}s** behind session best")
    else:
        st.success(f"📊 Total sector advantage: **{total_delta:.3f}s** ahead of combined session best")


def display_stint_performance(driver_laps: pd.DataFrame, driver: str, color: str) -> None:
    """Display lap time evolution over the race/session"""
    
    # Filter valid laps
    valid_laps = driver_laps[driver_laps['LapTime'].notna()].copy()
    
    if valid_laps.empty:
        st.warning("No valid laps for stint analysis")
        return
    
    # Convert lap times to seconds
    valid_laps['LapTimeSeconds'] = valid_laps['LapTime'].dt.total_seconds()
    
    # Get compound info
    compounds = valid_laps['Compound'].unique()
    
    fig = go.Figure()
    
    for compound in compounds:
        compound_laps = valid_laps[valid_laps['Compound'] == compound]
        
        compound_color = TIRE_COMPOUNDS.get(compound, {}).get('color', color)
        
        fig.add_trace(go.Scatter(
            x=compound_laps['LapNumber'],
            y=compound_laps['LapTimeSeconds'],
            mode='lines+markers',
            name=compound,
            line=dict(color=compound_color, width=2),
            marker=dict(size=6)
        ))
    
    # Calculate average lap time for y-axis centering
    avg_time = valid_laps['LapTimeSeconds'].mean()
    std_time = valid_laps['LapTimeSeconds'].std()
    
    fig.update_layout(
        title=f"{driver} - Lap Time vs Lap Number",
        xaxis_title="Lap Number",
        yaxis_title="Lap Time (seconds)",
        template="plotly_dark",
        height=400,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        yaxis=dict(
            range=[avg_time - 3*std_time, avg_time + 3*std_time] if std_time > 0 else None
        )
    )
    
    st.plotly_chart(fig, use_container_width=True)


def display_tire_degradation(driver_laps: pd.DataFrame, driver: str, color: str) -> None:
    """Display tire degradation analysis"""
    
    # Get compounds used
    compounds = driver_laps['Compound'].dropna().unique()
    
    if len(compounds) == 0:
        st.warning("No tire compound data available")
        return
    
    # Calculate degradation for each compound
    degradation_data = []
    
    for compound in compounds:
        deg_rate, r_squared = calculate_tire_degradation(driver_laps, compound)
        
        if not np.isnan(deg_rate):
            degradation_data.append({
                'Compound': compound,
                'Degradation Rate': deg_rate,
                'R² Fit': r_squared,
                'Interpretation': 'Good fit' if r_squared > 0.5 else 'Poor fit'
            })
    
    if not degradation_data:
        st.info("Insufficient data for degradation analysis (need at least 3 clean laps per compound)")
        return
    
    # Create DataFrame
    deg_df = pd.DataFrame(degradation_data)
    
    # Display metrics
    cols = st.columns(len(degradation_data))
    
    for i, (col, row) in enumerate(zip(cols, degradation_data)):
        with col:
            compound_color = TIRE_COMPOUNDS.get(row['Compound'], {}).get('color', '#FFFFFF')
            
            st.markdown(f"""
            <div style='background: linear-gradient(90deg, {compound_color}40, transparent); 
                        padding: 15px; border-radius: 10px; border-left: 4px solid {compound_color};'>
                <h4 style='margin: 0; color: {compound_color};'>{row['Compound']}</h4>
            </div>
            """, unsafe_allow_html=True)
            
            st.metric(
                "Degradation Rate",
                f"{row['Degradation Rate']:.3f} s/lap",
                help="Average time lost per lap due to tire wear"
            )
            
            st.caption(f"R² = {row['R² Fit']:.3f} ({row['Interpretation']})")
    
    # Degradation visualization
    st.markdown("**Degradation Rate Comparison:**")
    
    fig = go.Figure()
    
    for row in degradation_data:
        compound_color = TIRE_COMPOUNDS.get(row['Compound'], {}).get('color', '#FFFFFF')
        
        fig.add_trace(go.Bar(
            x=[row['Compound']],
            y=[row['Degradation Rate']],
            name=row['Compound'],
            marker_color=compound_color,
            text=f"{row['Degradation Rate']:.3f}",
            textposition='outside'
        ))
    
    fig.update_layout(
        title="Tire Degradation Rate by Compound",
        xaxis_title="Compound",
        yaxis_title="Degradation Rate (s/lap)",
        template="plotly_dark",
        height=350,
        showlegend=False
    )
    
    st.plotly_chart(fig, use_container_width=True)


# Module entry point
if __name__ == "__main__":
    render_lap_analysis()
