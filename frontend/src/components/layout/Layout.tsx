import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-f1-black">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-f1-gray/30 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Apex Analyst. Built with FastF1 & Jolpica API.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="https://github.com/hamzanaeem10/ApexAnalyst" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                GitHub
              </a>
              <span>•</span>
              <a href="https://theoehrly.github.io/Fast-F1/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                FastF1 Docs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
