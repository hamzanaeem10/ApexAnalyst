"""
Module 4: Historical Strategy Analysis (The Pit Stop Planner)
Analyze historical race strategies using jolpica-f1 API data
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Optional, Tuple
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from data.jolpica_client import (
    get_client, parse_lap_time, analyze_race_strategies,
    calculate_strategy_efficiency
)
from config.settings import TIRE_COMPOUNDS


def render_strategy_analysis():
    """Main render function for historical strategy analysis"""
    
    st.header("🏁 Historical Strategy Analysis")
    st.markdown("*The Pit Stop Planner - Learn from past race strategies*")
    
    # Get API client
    client = get_client()
    
    # Season and Race Selection
    col1, col2 = st.columns(2)
    
    with col1:
        year = st.selectbox(
            "Season",
            options=list(range(2023, 2009, -1)),
            key="strategy_year",
            help="Select a historical season (data available from 2010)"
        )
    
    with col2:
        # Get races for selected season
        with st.spinner("Loading races..."):
            races_df = client.get_races(year)
        
        if races_df.empty:
            st.error("No race data available for this season")
            return
        
        race_options = races_df['raceName'].tolist()
        race_rounds = races_df['round'].tolist()
        
        selected_race = st.selectbox(
            "Race",
            options=range(len(race_options)),
            format_func=lambda x: race_options[x],
            key="strategy_race"
        )
        
        race_round = int(race_rounds[selected_race])
    
    st.divider()
    
    # Analysis Options
    st.subheader("Strategy Filters")
    
    col1, col2 = st.columns(2)
    
    with col1:
        strategy_filter = st.multiselect(
            "Strategy Types",
            options=["0-stop", "1-stop", "2-stop", "3-stop", "4+ stops"],
            default=["1-stop", "2-stop"],
            key="strategy_filter",
            help="Filter by number of pit stops"
        )
    
    with col2:
        pit_time_loss = st.number_input(
            "Estimated Pit Stop Time Loss (s)",
            min_value=15.0, max_value=35.0, value=22.0, step=0.5,
            key="pit_time_loss",
            help="Average time lost per pit stop (stationary + in/out laps)"
        )
    
    # Load and Analyze Button
    if st.button("🔍 Analyze Race Strategies", type="primary", key="run_strategy_analysis"):
        with st.spinner("Loading race data... This may take a moment."):
            try:
                # Fetch all required data
                results_df = client.get_race_results(year, race_round)
                lap_times_df = client.get_lap_times(year, race_round)
                pit_stops_df = client.get_pit_stops(year, race_round)
                
                if results_df.empty:
                    st.error("No race results available")
                    return
                
                if lap_times_df.empty:
                    st.warning("Limited lap time data available - some analysis may be incomplete")
                
                # Analyze strategies
                strategy_df = analyze_race_strategies(lap_times_df, pit_stops_df, results_df)
                
                if strategy_df.empty:
                    st.warning("Unable to analyze strategies - insufficient data")
                    return
                
                # Store in session state
                st.session_state['strategy_data'] = {
                    'results': results_df,
                    'laps': lap_times_df,
                    'pits': pit_stops_df,
                    'strategies': strategy_df,
                    'race_name': race_options[selected_race],
                    'year': year
                }
                
                display_strategy_analysis(
                    strategy_df, results_df, lap_times_df, pit_stops_df,
                    strategy_filter, pit_time_loss,
                    race_options[selected_race], year
                )
                
            except Exception as e:
                st.error(f"Error loading race data: {e}")
                import traceback
                st.code(traceback.format_exc())


def display_strategy_analysis(strategy_df: pd.DataFrame, results_df: pd.DataFrame,
                              lap_times_df: pd.DataFrame, pit_stops_df: pd.DataFrame,
                              strategy_filter: List[str], pit_time_loss: float,
                              race_name: str, year: int) -> None:
    """Display complete strategy analysis"""
    
    st.divider()
    st.subheader(f"📊 {year} {race_name} - Strategy Analysis")
    
    # 1. Race Overview
    display_race_overview(results_df, strategy_df)
    
    st.divider()
    
    # 2. Strategy Breakdown Table
    st.subheader("📋 Strategy Breakdown")
    display_strategy_table(strategy_df, results_df, strategy_filter)
    
    st.divider()
    
    # 3. Strategy Efficiency Comparison
    st.subheader("⚡ Strategy Efficiency Analysis")
    efficiency_df = calculate_strategy_efficiency(strategy_df, pit_time_loss)
    display_strategy_efficiency(efficiency_df, strategy_filter)
    
    st.divider()
    
    # 4. Pit Stop Analysis
    st.subheader("🔧 Pit Stop Analysis")
    display_pit_stop_analysis(pit_stops_df, results_df)
    
    st.divider()
    
    # 5. Lap Time Progression
    st.subheader("📈 Lap Time Progression")
    display_lap_progression(lap_times_df, results_df)


def display_race_overview(results_df: pd.DataFrame, strategy_df: pd.DataFrame) -> None:
    """Display race overview statistics"""
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if not results_df.empty:
            winner = results_df.iloc[0]
            driver_name = f"{winner['Driver']['givenName']} {winner['Driver']['familyName']}"
            st.metric("🏆 Winner", driver_name)
    
    with col2:
        finishers = len(results_df[results_df['status'] == 'Finished']) if 'status' in results_df.columns else len(results_df)
        st.metric("🏁 Finishers", finishers)
    
    with col3:
        if not strategy_df.empty:
            avg_stops = strategy_df['numStops'].mean()
            st.metric("🔧 Avg Pit Stops", f"{avg_stops:.1f}")
    
    with col4:
        if not strategy_df.empty:
            strategies_used = strategy_df['strategyType'].nunique()
            st.metric("📊 Unique Strategies", strategies_used)


def display_strategy_table(strategy_df: pd.DataFrame, results_df: pd.DataFrame,
                           strategy_filter: List[str]) -> None:
    """Display detailed strategy comparison table"""
    
    if strategy_df.empty:
        st.info("No strategy data available")
        return
    
    # Merge with results for position info
    merged_df = strategy_df.copy()
    
    # Create driver name mapping from results
    driver_names = {}
    driver_positions = {}
    driver_constructors = {}
    
    for _, row in results_df.iterrows():
        driver_id = row['Driver']['driverId']
        driver_names[driver_id] = f"{row['Driver']['givenName']} {row['Driver']['familyName']}"
        driver_positions[driver_id] = int(row['position'])
        driver_constructors[driver_id] = row['Constructor']['name']
    
    merged_df['driverName'] = merged_df['driverId'].map(driver_names)
    merged_df['position'] = merged_df['driverId'].map(driver_positions)
    merged_df['constructor'] = merged_df['driverId'].map(driver_constructors)
    
    # Filter by strategy type
    if strategy_filter:
        filter_conditions = []
        for f in strategy_filter:
            if f == "0-stop":
                filter_conditions.append(merged_df['numStops'] == 0)
            elif f == "1-stop":
                filter_conditions.append(merged_df['numStops'] == 1)
            elif f == "2-stop":
                filter_conditions.append(merged_df['numStops'] == 2)
            elif f == "3-stop":
                filter_conditions.append(merged_df['numStops'] == 3)
            elif f == "4+ stops":
                filter_conditions.append(merged_df['numStops'] >= 4)
        
        if filter_conditions:
            combined_filter = filter_conditions[0]
            for cond in filter_conditions[1:]:
                combined_filter = combined_filter | cond
            merged_df = merged_df[combined_filter]
    
    # Sort by position
    merged_df = merged_df.sort_values('position')
    
    # Format for display
    display_df = merged_df[['position', 'driverName', 'constructor', 'strategyType', 
                            'numStops', 'avgLapTime', 'bestLapTime', 'totalLaps']].copy()
    
    display_df.columns = ['Pos', 'Driver', 'Team', 'Strategy', 'Stops', 
                          'Avg Lap (s)', 'Best Lap (s)', 'Laps']
    
    display_df['Avg Lap (s)'] = display_df['Avg Lap (s)'].round(3)
    display_df['Best Lap (s)'] = display_df['Best Lap (s)'].round(3)
    
    st.dataframe(
        display_df,
        hide_index=True,
        use_container_width=True,
        column_config={
            "Pos": st.column_config.NumberColumn("Pos", width="small"),
            "Driver": st.column_config.TextColumn("Driver", width="medium"),
            "Team": st.column_config.TextColumn("Team", width="medium"),
            "Strategy": st.column_config.TextColumn("Strategy", width="small"),
            "Stops": st.column_config.NumberColumn("Stops", width="small"),
            "Avg Lap (s)": st.column_config.NumberColumn("Avg Lap (s)", format="%.3f"),
            "Best Lap (s)": st.column_config.NumberColumn("Best Lap (s)", format="%.3f"),
            "Laps": st.column_config.NumberColumn("Laps", width="small")
        }
    )


def display_strategy_efficiency(efficiency_df: pd.DataFrame, 
                                strategy_filter: List[str]) -> None:
    """Display strategy efficiency comparison chart"""
    
    if efficiency_df.empty:
        st.info("No efficiency data available")
        return
    
    # Group by strategy type
    strategy_summary = efficiency_df.groupby('strategyType').agg({
        'avgLapTime': 'mean',
        'totalPitTimeLoss': 'mean',
        'estimatedRaceTime': 'mean',
        'deltaToOptimal': 'mean',
        'driverId': 'count'
    }).reset_index()
    
    strategy_summary.columns = ['Strategy', 'Avg Lap Pace', 'Pit Time Loss', 
                                 'Est. Race Time', 'Delta to Best', 'Drivers']
    
    # Filter
    if strategy_filter:
        strategy_summary = strategy_summary[
            strategy_summary['Strategy'].isin([f"{s.replace('-stop', '')}-stop" for s in strategy_filter])
        ]
    
    # Create bar chart
    fig = go.Figure()
    
    # Pit time loss bars
    fig.add_trace(go.Bar(
        x=strategy_summary['Strategy'],
        y=strategy_summary['Pit Time Loss'],
        name='Pit Stop Time Loss',
        marker_color='#FF6B6B'
    ))
    
    # Pace difference (normalized)
    min_pace = strategy_summary['Avg Lap Pace'].min()
    pace_delta = (strategy_summary['Avg Lap Pace'] - min_pace) * strategy_summary['Drivers'].max()
    
    fig.add_trace(go.Bar(
        x=strategy_summary['Strategy'],
        y=pace_delta,
        name='Pace Deficit (scaled)',
        marker_color='#4ECDC4'
    ))
    
    fig.update_layout(
        title="Strategy Efficiency: Time Lost to Pit Stops vs Pace",
        xaxis_title="Strategy Type",
        yaxis_title="Time (seconds)",
        barmode='group',
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
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Strategy summary metrics
    st.markdown("**Strategy Comparison:**")
    
    cols = st.columns(len(strategy_summary))
    
    for col, (_, row) in zip(cols, strategy_summary.iterrows()):
        with col:
            st.markdown(f"""
            <div style='background: linear-gradient(135deg, #2d3436, #636e72); 
                        padding: 15px; border-radius: 10px; text-align: center;'>
                <h4 style='margin: 0; color: #74b9ff;'>{row['Strategy']}</h4>
                <p style='margin: 5px 0; color: #dfe6e9;'>{int(row['Drivers'])} drivers</p>
            </div>
            """, unsafe_allow_html=True)
            
            st.metric("Avg Pace", f"{row['Avg Lap Pace']:.3f}s")
            st.metric("Pit Time Lost", f"{row['Pit Time Loss']:.1f}s")


def display_pit_stop_analysis(pit_stops_df: pd.DataFrame, results_df: pd.DataFrame) -> None:
    """Display pit stop timing analysis"""
    
    if pit_stops_df.empty:
        st.info("No pit stop data available for this race")
        return
    
    # Create driver name mapping
    driver_names = {}
    for _, row in results_df.iterrows():
        driver_id = row['Driver']['driverId']
        driver_names[driver_id] = f"{row['Driver']['givenName'][0]}. {row['Driver']['familyName']}"
    
    pit_stops_df = pit_stops_df.copy()
    pit_stops_df['driverName'] = pit_stops_df['driverId'].map(driver_names)
    pit_stops_df['lap'] = pit_stops_df['lap'].astype(int)
    pit_stops_df['duration'] = pit_stops_df['duration'].astype(float)
    
    # Pit stop timing scatter
    fig = px.scatter(
        pit_stops_df,
        x='lap',
        y='duration',
        color='driverName',
        size='duration',
        hover_data=['driverId', 'stop'],
        title="Pit Stop Timing & Duration",
        labels={'lap': 'Lap Number', 'duration': 'Stop Duration (s)', 'driverName': 'Driver'},
        template="plotly_dark"
    )
    
    fig.update_layout(height=400)
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Pit window analysis
    st.markdown("**Pit Windows:**")
    
    # Analyze pit stop windows
    pit_summary = pit_stops_df.groupby('stop').agg({
        'lap': ['mean', 'std', 'min', 'max'],
        'duration': 'mean'
    }).round(2)
    
    pit_summary.columns = ['Avg Lap', 'Std Dev', 'Earliest', 'Latest', 'Avg Duration']
    pit_summary.index.name = 'Stop #'
    
    st.dataframe(pit_summary, use_container_width=True)


def display_lap_progression(lap_times_df: pd.DataFrame, results_df: pd.DataFrame) -> None:
    """Display lap time progression for top drivers"""
    
    if lap_times_df.empty:
        st.info("No lap time data available")
        return
    
    # Get top 5 finishers
    top_drivers = []
    driver_names = {}
    
    for _, row in results_df.head(5).iterrows():
        driver_id = row['Driver']['driverId']
        top_drivers.append(driver_id)
        driver_names[driver_id] = f"{row['Driver']['givenName'][0]}. {row['Driver']['familyName']}"
    
    # Filter lap times
    filtered_laps = lap_times_df[lap_times_df['driverId'].isin(top_drivers)].copy()
    filtered_laps['time_seconds'] = filtered_laps['time'].apply(parse_lap_time)
    filtered_laps['driverName'] = filtered_laps['driverId'].map(driver_names)
    
    # Create line chart
    fig = px.line(
        filtered_laps,
        x='lap',
        y='time_seconds',
        color='driverName',
        title="Lap Time Progression (Top 5 Finishers)",
        labels={'lap': 'Lap Number', 'time_seconds': 'Lap Time (s)', 'driverName': 'Driver'},
        template="plotly_dark"
    )
    
    fig.update_layout(height=400)
    
    st.plotly_chart(fig, use_container_width=True)


# Module entry point
if __name__ == "__main__":
    render_strategy_analysis()
