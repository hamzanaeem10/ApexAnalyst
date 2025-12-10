import { NavLink } from 'react-router-dom';
import { 
  Activity, 
  Timer, 
  Cloud, 
  Target, 
  Layers,
  Home,
  Menu,
  X,
  BarChart3,
  Zap
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/telemetry', label: 'Telemetry', icon: Activity },
  { path: '/race-analysis', label: 'Race', icon: BarChart3 },
  { path: '/lap-analysis', label: 'Laps', icon: Timer },
  { path: '/weather', label: 'Weather', icon: Cloud },
  { path: '/strategy', label: 'Strategy', icon: Target },
  { path: '/segments', label: 'Segments', icon: Layers },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5">
      {/* Glass background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D12]/95 via-[#151520]/95 to-[#0D0D12]/95 backdrop-blur-xl" />
      
      {/* Red accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-f1-red to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-f1-red via-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-f1-red/30 group-hover:shadow-f1-red/50 transition-all duration-300">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0D0D12] animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-white tracking-tight">
                APEX<span className="text-f1-red">ANALYST</span>
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">F1 Data Intelligence</p>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-2xl p-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link flex items-center gap-2 text-sm ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Right side actions */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden relative bg-[#0D0D12]/98 backdrop-blur-xl border-t border-white/5">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-f1-red/20 to-transparent text-white border-l-2 border-f1-red'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
