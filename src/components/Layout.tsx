import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { PullToRefresh } from './PullToRefresh';

interface LayoutProps {
  children: React.ReactNode;
  onSearchToggle: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  bottomNav?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, onSearchToggle, onRefresh, isRefreshing, bottomNav }) => {
  const content = (
    <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      {children}
    </main>
  );

  return (
    <div className="min-h-screen bg-app-bg text-zinc-100 font-sans selection:bg-primary-accent/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-secondary-accent/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-primary-accent rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-primary-accent/20 overflow-hidden">
              <AppLogo size={40} className="w-full h-full" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-white">Mosaic</span>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all hidden sm:block"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-primary-accent' : ''}`} />
              </button>
            )}
            <button 
              onClick={onSearchToggle}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {onRefresh ? (
        <PullToRefresh onRefresh={onRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        content
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-app-bg">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-30">
            <AppLogo size={16} className="rounded-sm" />
            <span className="text-xs font-mono uppercase tracking-widest">Mosaic Media Tracker</span>
          </div>
          <div className="flex gap-8 text-xs font-medium text-white">
            <span className="hover:text-primary-accent cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-primary-accent cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-primary-accent cursor-pointer transition-colors">API</span>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation */}
      {bottomNav}
    </div>
  );
};
