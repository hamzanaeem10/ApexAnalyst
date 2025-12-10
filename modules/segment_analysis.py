"""
Module 5: Circuit Segment Analysis (The Corner King)
Analyze performance through specific track segments and corners
"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from typing import Dict, List, Optional, Tuple
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from data.fastf1_loader import (
    load_session, get_laps_data, get_telemetry_data,
    get_driver_info, get_driver_color, filter_telemetry_by_distance,
    get_all_driver_abbreviations, get_circuit_info
)
from config.settings import TEAM_COLORS


def render_segment_analysis():
    """Main render function for circuit segment analysis"""
    
    st.header("🏁 Circuit Segment Analysis")
    st.markdown("*The Corner King - Discover who excels through each section*")
    
    # Session Selection
    col1, col2, col3 = st.columns(3)
    
    with col1:
        year = st.selectbox("Season", options=list(range(2024, 2017, -1)), key="segment_year")
    
    with col2:
        try:
            import fastf1
            schedule = fastf1.get_event_schedule(year)
            events = schedule[schedule['EventFormat'] != 'testing']['EventName'].tolist()
            event = st.selectbox("Event", options=events, key="segment_event")
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
            key="segment_session"
        )
    
    # Load Session
    if st.button("Load Session Data", key="load_segment_session"):
        with st.spinner("Loading session data..."):
            try:
                session = load_session(year, event, session_type)
                st.session_state['segment_session_data'] = session
                st.session_state['segment_data_loaded'] = True
                st.success("Session loaded successfully!")
                
                # Get track length for segment selection
                try:
                    fastest_lap = session.laps.pick_fastest()
                    tel = fastest_lap.get_telemetry()
                    track_length = tel['Distance'].max()
                    st.session_state['segment_track_length'] = track_length
                except:
                    st.session_state['segment_track_length'] = 5000  # Default
                    
            except Exception as e:
                st.error(f"Error loading session: {e}")
                return
    
    if not st.session_state.get('segment_data_loaded', False):
        st.info("👆 Select a session and click 'Load Session Data' to begin analysis")
        return
    
    session = st.session_state['segment_session_data']
    track_length = st.session_state.get('segment_track_length', 5000)
    
    st.divider()
    
    # Segment Definition
    st.subheader("Define Track Segment")
    
    col1, col2 = st.columns(2)
    
    with col1:
        start_dist = st.number_input(
            "Start Distance (m)",
            min_value=0,
            max_value=int(track_length),
            value=0,
            step=50,
            key="segment_start",
            help=f"Track length: {track_length:.0f}m"
        )
    
    with col2:
        end_dist = st.number_input(
            "End Distance (m)",
            min_value=0,
            max_value=int(track_length),
            value=min(500, int(track_length)),
            step=50,
            key="segment_end"
        )
    
    # Validate segment
    if end_dist <= start_dist:
        st.error("End distance must be greater than start distance")
        return
    
    # Team Selection for Comparison
    st.subheader("Select Teams for Comparison")
    
    driver_info = get_driver_info(session)
    available_teams = driver_info['TeamName'].unique().tolist()
    
    selected_teams = st.multiselect(
        "Select Teams",
        options=available_teams,
        default=available_teams[:3] if len(available_teams) >= 3 else available_teams,
        key="segment_teams"
    )
    
    if st.button("🔍 Analyze Segment", type="primary", key="run_segment_analysis"):
        with st.spinner("Analyzing segment performance..."):
            try:
                display_segment_analysis(
                    session, start_dist, end_dist,
                    selected_teams, driver_info
                )
            except Exception as e:
                st.error(f"Error analyzing segment: {e}")
                import traceback
                st.code(traceback.format_exc())


def display_segment_analysis(session, start_dist: float, end_dist: float,
                             selected_teams: List[str], driver_info: pd.DataFrame) -> None:
    """Display complete segment analysis"""
    
    st.divider()
    
    segment_length = end_dist - start_dist
    st.info(f"📏 Analyzing segment from **{start_dist}m** to **{end_dist}m** (length: **{segment_length}m**)")
    
    # Calculate segment metrics for all drivers
    segment_metrics = calculate_segment_metrics(session, start_dist, end_dist)
    
    if segment_metrics.empty:
        st.warning("Unable to calculate segment metrics - insufficient data")
        return
    
    # Merge with driver info
    segment_metrics = segment_metrics.merge(
        driver_info[['Abbreviation', 'TeamName', 'FullName']],
        left_on='Driver',
        right_on='Abbreviation',
        how='left'
    )
    
    # 1. Segment Speed Leaderboard
    st.subheader("🏆 Segment Speed Leaderboard")
    display_speed_leaderboard(segment_metrics)
    
    st.divider()
    
    # 2. Segment Performance Distribution
    st.subheader("📊 Segment Performance Distribution")
    display_performance_distribution(segment_metrics, selected_teams)
    
    st.divider()
    
    # 3. Speed Trace Comparison
    st.subheader("📈 Speed Trace Comparison")
    display_speed_trace(session, start_dist, end_dist, segment_metrics, selected_teams)


def calculate_segment_metrics(session, start_dist: float, end_dist: float) -> pd.DataFrame:
    """Calculate performance metrics for each driver through the segment"""
    
    metrics = []
    
    all_laps = session.laps.pick_quicklaps()
    
    for driver in session.drivers:
        try:
            driver_laps = all_laps.pick_driver(driver)
            
            if driver_laps.empty:
                continue
            
            # Get fastest lap for the driver
            fastest_lap = driver_laps.pick_fastest()
            
            if fastest_lap is None:
                continue
            
            # Get telemetry
            tel = fastest_lap.get_telemetry()
            
            # Filter to segment
            segment_tel = filter_telemetry_by_distance(tel, start_dist, end_dist)
            
            if segment_tel.empty or len(segment_tel) < 2:
                continue
            
            # Calculate metrics
            avg_speed = segment_tel['Speed'].mean()
            max_speed = segment_tel['Speed'].max()
            min_speed = segment_tel['Speed'].min()
            
            # Calculate segment time
            if 'Time' in segment_tel.columns:
                segment_time = (segment_tel['Time'].iloc[-1] - segment_tel['Time'].iloc[0]).total_seconds()
            else:
                # Estimate from distance and average speed
                segment_length = end_dist - start_dist
                segment_time = (segment_length / 1000) / (avg_speed / 3600) if avg_speed > 0 else 0
            
            # Get driver color
            try:
                color = '#' + session.get_driver(driver)['TeamColor']
            except:
                color = '#FFFFFF'
            
            metrics.append({
                'Driver': driver,
                'AvgSpeed': avg_speed,
                'MaxSpeed': max_speed,
                'MinSpeed': min_speed,
                'SegmentTime': segment_time,
                'Color': color
            })
            
        except Exception as e:
            continue
    
    return pd.DataFrame(metrics)


def display_speed_leaderboard(segment_metrics: pd.DataFrame) -> None:
    """Display top 10 drivers by average speed"""
    
    # Sort by average speed (descending)
    leaderboard = segment_metrics.nlargest(10, 'AvgSpeed').copy()
    
    # Add rank
    leaderboard['Rank'] = range(1, len(leaderboard) + 1)
    
    # Calculate delta to leader
    leader_speed = leaderboard['AvgSpeed'].iloc[0]
    leaderboard['SpeedDelta'] = leaderboard['AvgSpeed'] - leader_speed
    
    # Calculate time delta (approximate)
    leader_time = leaderboard['SegmentTime'].iloc[0]
    leaderboard['TimeDelta'] = leaderboard['SegmentTime'] - leader_time
    
    # Display as table
    display_cols = ['Rank', 'Driver', 'FullName', 'TeamName', 'AvgSpeed', 'MaxSpeed', 'MinSpeed', 'SegmentTime', 'SpeedDelta']
    display_df = leaderboard[display_cols].copy()
    display_df.columns = ['#', 'Code', 'Driver', 'Team', 'Avg Speed (km/h)', 'Max Speed (km/h)', 
                          'Min Speed (km/h)', 'Segment Time (s)', 'Speed Delta (km/h)']
    
    # Format numbers
    display_df['Avg Speed (km/h)'] = display_df['Avg Speed (km/h)'].round(1)
    display_df['Max Speed (km/h)'] = display_df['Max Speed (km/h)'].round(1)
    display_df['Min Speed (km/h)'] = display_df['Min Speed (km/h)'].round(1)
    display_df['Segment Time (s)'] = display_df['Segment Time (s)'].round(3)
    display_df['Speed Delta (km/h)'] = display_df['Speed Delta (km/h)'].round(1)
    
    st.dataframe(
        display_df,
        hide_index=True,
        use_container_width=True,
        column_config={
            "#": st.column_config.NumberColumn("#", width="small"),
            "Code": st.column_config.TextColumn("Code", width="small"),
            "Driver": st.column_config.TextColumn("Driver", width="medium"),
            "Team": st.column_config.TextColumn("Team", width="medium"),
            "Avg Speed (km/h)": st.column_config.NumberColumn("Avg Speed", format="%.1f"),
            "Max Speed (km/h)": st.column_config.NumberColumn("Max Speed", format="%.1f"),
            "Min Speed (km/h)": st.column_config.NumberColumn("Min Speed", format="%.1f"),
            "Segment Time (s)": st.column_config.NumberColumn("Seg Time", format="%.3f"),
            "Speed Delta (km/h)": st.column_config.NumberColumn("Δ Speed", format="%+.1f")
        }
    )
    
    # Highlight top 3
    if len(leaderboard) >= 3:
        cols = st.columns(3)
        medals = ['🥇', '🥈', '🥉']
        
        for i, (col, medal) in enumerate(zip(cols, medals)):
            with col:
                driver_row = leaderboard.iloc[i]
                st.markdown(f"""
                <div style='background: linear-gradient(135deg, {driver_row['Color']}40, transparent); 
                            padding: 15px; border-radius: 10px; text-align: center;
                            border-left: 4px solid {driver_row['Color']};'>
                    <h3 style='margin: 0;'>{medal} {driver_row['Driver']}</h3>
                    <p style='margin: 5px 0; opacity: 0.8;'>{driver_row['TeamName']}</p>
                    <h4 style='margin: 0; color: #4ECDC4;'>{driver_row['AvgSpeed']:.1f} km/h</h4>
                </div>
                """, unsafe_allow_html=True)


def display_performance_distribution(segment_metrics: pd.DataFrame, 
                                      selected_teams: List[str]) -> None:
    """Display box plot of segment times by team"""
    
    if not selected_teams:
        st.info("Select teams to see performance distribution")
        return
    
    # Filter to selected teams
    filtered = segment_metrics[segment_metrics['TeamName'].isin(selected_teams)]
    
    if filtered.empty:
        st.warning("No data available for selected teams")
        return
    
    # Create box plot
    fig = px.box(
        filtered,
        x='TeamName',
        y='SegmentTime',
        color='TeamName',
        points='all',
        hover_data=['Driver', 'AvgSpeed'],
        title="Segment Time Distribution by Team",
        labels={'TeamName': 'Team', 'SegmentTime': 'Segment Time (seconds)'},
        template="plotly_dark"
    )
    
    fig.update_layout(
        height=450,
        showlegend=False,
        xaxis_tickangle=-45
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Team comparison stats
    st.markdown("**Team Consistency Analysis:**")
    
    team_stats = filtered.groupby('TeamName').agg({
        'SegmentTime': ['mean', 'std', 'min', 'max'],
        'AvgSpeed': 'mean'
    }).round(3)
    
    team_stats.columns = ['Mean Time (s)', 'Std Dev (s)', 'Best Time (s)', 
                          'Worst Time (s)', 'Avg Speed (km/h)']
    team_stats = team_stats.sort_values('Mean Time (s)')
    
    st.dataframe(team_stats, use_container_width=True)


def display_speed_trace(session, start_dist: float, end_dist: float,
                        segment_metrics: pd.DataFrame, selected_teams: List[str]) -> None:
    """Display speed trace comparison through the segment"""
    
    # Get fastest overall driver
    if segment_metrics.empty:
        st.warning("No data for speed trace")
        return
    
    fastest_driver = segment_metrics.nlargest(1, 'AvgSpeed')['Driver'].iloc[0]
    
    # Get drivers from selected teams
    team_drivers = segment_metrics[segment_metrics['TeamName'].isin(selected_teams)]['Driver'].tolist()
    
    # Ensure fastest driver is included
    if fastest_driver not in team_drivers:
        team_drivers.insert(0, fastest_driver)
    
    fig = go.Figure()
    
    for driver in team_drivers[:6]:  # Limit to 6 drivers for clarity
        try:
            driver_laps = session.laps.pick_driver(driver).pick_quicklaps()
            if driver_laps.empty:
                continue
            
            fastest_lap = driver_laps.pick_fastest()
            tel = fastest_lap.get_telemetry()
            segment_tel = filter_telemetry_by_distance(tel, start_dist, end_dist)
            
            if segment_tel.empty:
                continue
            
            # Get driver info
            driver_row = segment_metrics[segment_metrics['Driver'] == driver].iloc[0]
            color = driver_row['Color']
            team = driver_row.get('TeamName', 'Unknown')
            
            is_fastest = driver == fastest_driver
            
            fig.add_trace(go.Scatter(
                x=segment_tel['Distance'],
                y=segment_tel['Speed'],
                name=f"{driver} ({team})" + (" 👑" if is_fastest else ""),
                line=dict(
                    color=color,
                    width=3 if is_fastest else 2,
                    dash='solid' if is_fastest else None
                ),
                opacity=1.0 if is_fastest else 0.7
            ))
            
        except Exception as e:
            continue
    
    fig.update_layout(
        title="Speed Profile Through Segment",
        xaxis_title="Distance (m)",
        yaxis_title="Speed (km/h)",
        template="plotly_dark",
        height=450,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Key insights
    if len(team_drivers) > 1:
        st.markdown(f"""
        💡 **Key Insight:** The segment leader is **{fastest_driver}** with an average speed of 
        **{segment_metrics[segment_metrics['Driver'] == fastest_driver]['AvgSpeed'].iloc[0]:.1f} km/h**.
        Compare the speed traces to identify braking points and acceleration zones where 
        other drivers might be losing time.
        """)


# Module entry point
if __name__ == "__main__":
    render_segment_analysis()
