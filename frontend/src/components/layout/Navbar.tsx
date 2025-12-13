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
  { path: '/', label: 'DASHBOARD', icon: Home },
  { path: '/telemetry', label: 'TELEMETRY', icon: Activity },
  { path: '/race-analysis', label: 'RACE', icon: BarChart3 },
  { path: '/lap-analysis', label: 'LAPS', icon: Timer },
  { path: '/weather', label: 'WEATHER', icon: Cloud },
  { path: '/strategy', label: 'STRATEGY', icon: Target },
  { path: '/segments', label: 'SEGMENTS', icon: Layers },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-apex-carbon border-b border-apex-chrome/30">
      {/* Red accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-apex-red/50 to-transparent" />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-apex-red flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-apex-green border border-apex-carbon" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-base font-bold tracking-wider">
                <span className="text-apex-red">APEX</span><span className="text-white">ANALYST</span>
              </h1>
              <p className="text-[9px] text-apex-chrome tracking-[0.25em] font-medium">F1 DATA INTELLIGENCE</p>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 px-4 py-5 text-xs font-semibold tracking-wider transition-colors ${
                    isActive 
                      ? 'text-white' 
                      : 'text-apex-chrome hover:text-white/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {/* Active indicator - red underline */}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-apex-red" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right side - LIVE button */}
          <div className="hidden lg:flex items-center">
            <button className="flex items-center gap-2 px-5 py-2 border border-apex-red/50 bg-apex-red/10 hover:bg-apex-red/20 transition-colors">
              <div className="w-1.5 h-1.5 bg-apex-green animate-pulse" />
              <span className="text-xs font-bold text-apex-red tracking-wider">LIVE</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2.5 border border-apex-chrome/30 hover:border-apex-chrome/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-apex-void border-t border-apex-chrome/30">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-xs font-medium tracking-wider transition-all ${
                    isActive
                      ? 'text-white bg-apex-red/10 border-l-2 border-apex-red'
                      : 'text-apex-chrome hover:text-white hover:bg-apex-steel/50'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            {/* Mobile LIVE button */}
            <div className="pt-3 mt-3 border-t border-apex-chrome/20">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-apex-red/50 bg-apex-red/10">
                <div className="w-1.5 h-1.5 bg-apex-green animate-pulse" />
                <span className="text-xs font-bold text-apex-red tracking-wider">LIVE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
