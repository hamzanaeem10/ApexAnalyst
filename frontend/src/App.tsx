import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import TelemetryPage from './pages/TelemetryPage';
import RaceAnalysisPage from './pages/RaceAnalysisPage';
import LapAnalysisPage from './pages/LapAnalysisPage';
import WeatherPage from './pages/WeatherPage';
import StrategyPage from './pages/StrategyPage';
import SegmentsPage from './pages/SegmentsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="telemetry" element={<TelemetryPage />} />
        <Route path="race-analysis" element={<RaceAnalysisPage />} />
        <Route path="lap-analysis" element={<LapAnalysisPage />} />
        <Route path="weather" element={<WeatherPage />} />
        <Route path="strategy" element={<StrategyPage />} />
        <Route path="segments" element={<SegmentsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
