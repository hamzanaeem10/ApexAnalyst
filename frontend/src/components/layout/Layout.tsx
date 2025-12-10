import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Github, ExternalLink, Zap } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#0D0D12] bg-pattern">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>
      
      {/* Modern Footer */}
      <footer className="relative mt-20">
        {/* Gradient line */}
        <div className="h-px bg-gradient-to-r from-transparent via-f1-red/50 to-transparent" />
        
        <div className="bg-gradient-to-b from-[#0D0D12] to-[#0A0A0F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-f1-red to-red-700 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-black text-white tracking-tight">
                    APEX<span className="text-f1-red">ANALYST</span>
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Professional F1 race strategy and performance analytics platform. 
                  Analyze telemetry, weather impact, and strategic decisions.
                </p>
              </div>

              {/* Data Sources */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Data Sources</h4>
                <div className="space-y-3">
                  <a 
                    href="https://theoehrly.github.io/Fast-F1/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-f1-red transition-colors group"
                  >
                    <span>FastF1 Library</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <a 
                    href="https://api.jolpi.ca/ergast/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-f1-red transition-colors group"
                  >
                    <span>Jolpica API (Historical Data)</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Project</h4>
                <a 
                  href="https://github.com/hamzanaeem10/ApexAnalyst" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:border-f1-red/50 transition-all group"
                >
                  <Github className="w-4 h-4" />
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-600">
                © {new Date().getFullYear()} Apex Analyst. Built with passion for F1.
              </p>
              <div className="flex items-center gap-6">
                <span className="text-xs text-gray-600">Data coverage: 1950 - Present</span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-600">Telemetry from 2018+</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
