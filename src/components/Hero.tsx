import React from 'react';
import { motion } from 'motion/react';
import { Film, Tv, Book, Gamepad2, ArrowRight } from 'lucide-react';
import { ViewType } from '../types';

interface HeroProps {
  onStart: (view: ViewType) => void;
}

export const Hero: React.FC<HeroProps> = ({ onStart }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-secondary-accent border border-white/5 shadow-sm p-8 md:p-16 mb-12">
      <div className="relative z-10 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary-accent/10 text-primary-accent text-xs font-bold uppercase tracking-wider mb-6">
            Phase 1: Architecture
          </span>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white mb-8 leading-[0.9]">
            Catalog your <span className="text-primary-accent italic">digital</span> universe.
          </h1>
          <p className="text-lg text-white mb-10 leading-relaxed max-w-lg">
            A minimalist tracker for your movies, series, books, and games. 
            Beautifully organized, data-driven, and designed for focus.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => onStart('tracker')}
              className="px-8 py-4 bg-primary-accent text-app-bg rounded-2xl font-semibold flex items-center gap-2 hover:brightness-110 hover:-translate-y-1 transition-all group shadow-lg shadow-primary-accent/10"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => onStart('archive')}
              className="px-8 py-4 bg-app-bg text-white border border-white/10 rounded-2xl font-semibold hover:bg-secondary-accent hover:-translate-y-1 transition-all"
            >
              View Archive
            </button>
          </div>
        </motion.div>
      </div>

      {/* Decorative Icons */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-[0.05] pointer-events-none hidden lg:block">
        <div className="grid grid-cols-2 gap-12 rotate-12">
          <Film size={240} color="white" />
          <Tv size={240} color="white" />
          <Book size={240} color="white" />
          <Gamepad2 size={240} color="white" />
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>
    </div>
  );
};
