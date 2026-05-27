import React from 'react';
import { Search, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { DynamicBackground } from './DynamicBackground';
import { AppLogo } from './AppLogo';

type Page = 'tracker' | 'backlog' | 'analytics' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  activePage: Page;
  setActivePage: (page: Page) => void;
  onSearchToggle: () => void;
  onAddClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activePage, 
  setActivePage, 
  onSearchToggle,
  onAddClick
}) => {
  const tabs: { id: Page; label: string }[] = [
    { id: 'tracker', label: 'Tracker' },
    { id: 'backlog', label: 'Backlog' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-transparent text-[#e7e7e7] font-sans selection:bg-[#e7e7e7]/10 flex flex-col relative">
      <DynamicBackground />
      
      {/* Top Header Shell */}
      <header className="sticky top-0 z-50 bg-[#242d3a]/75 backdrop-blur-md border-b border-[#576d87]/10">
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-0">
          {/* Header Top Row */}
          <div className="flex items-center justify-between">
            {/* Branding - Pure Sans-Serif Off-White with integrated Logo */}
            <div className="flex items-center gap-3">
              <div className="border border-white/10 rounded-xl p-0.5 overflow-hidden bg-[#242d3a]/50 backdrop-blur-sm shadow-md flex-shrink-0">
                <AppLogo className="h-8 w-8 rounded-[10px]" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-[#e7e7e7] font-sans">
                Mosaic
              </span>
            </div>

            {/* Actions: Add (Plus) and Search */}
            <div className="flex items-center gap-2">
              <button 
                onClick={onAddClick}
                className="p-2 text-[#576d87] hover:text-[#e7e7e7] transition-all rounded-full hover:bg-white/5"
                title="Add Media Item"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                onClick={onSearchToggle}
                className="p-2 text-[#576d87] hover:text-[#e7e7e7] transition-all rounded-full hover:bg-white/5"
                title="Toggle Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tab Bar Directly Underneath Branding Row */}
          <nav className="flex justify-start gap-8 mt-5">
            {tabs.map((tab) => {
              const isActive = activePage === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePage(tab.id)}
                  className={`relative py-3 text-xs uppercase tracking-widest font-bold transition-all focus:outline-none ${
                    isActive ? 'text-[#e7e7e7]' : 'text-[#576d87] hover:text-[#e7e7e7]/80'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#e7e7e7]"
                      transition={{ type: "spring", stiffness: 350, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 px-6 max-w-4xl mx-auto w-full transition-all">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-12 bg-[#242d3a]/70 border-t border-[#576d87]/15 mt-auto backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50 text-[#576d87]">
            <span className="text-[10px] font-mono uppercase tracking-widest">Mosaic Media Tracker</span>
          </div>
          <div className="flex gap-8 text-[11px] font-bold uppercase tracking-wider text-[#576d87]">
            <span className="hover:text-[#e7e7e7] cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-[#e7e7e7] cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-[#e7e7e7] cursor-pointer transition-colors">API</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
