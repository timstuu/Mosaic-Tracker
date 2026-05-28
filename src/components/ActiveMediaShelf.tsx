import React from 'react';
import { MediaItem, MediaType } from '../types';
import { motion } from 'motion/react';
import { Tv, Book, Gamepad2, Play, Plus } from 'lucide-react';

interface ActiveMediaShelfProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onIncrementEpisode?: (item: MediaItem) => void;
}

export const ActiveMediaShelf: React.FC<ActiveMediaShelfProps> = ({ items, onItemClick, onIncrementEpisode }) => {
  const activeItems = items;

  if (activeItems.length === 0) return null;

  const getTypeIcon = (type: MediaType) => {
    switch (type) {
      case MediaType.SHOW: return <Tv size={14} />;
      case MediaType.BOOK: return <Book size={14} />;
      case MediaType.GAME: return <Gamepad2 size={14} />;
      default: return <Play size={14} />;
    }
  };

  const getTypeLabel = (type: MediaType) => {
    switch (type) {
      case MediaType.SHOW: return 'Watching';
      case MediaType.BOOK: return 'Reading';
      case MediaType.GAME: return 'Playing';
      default: return 'Active';
    }
  };

  const formatProgress = (item: MediaItem) => {
    const s = String(item.currentSeason ?? 1).padStart(2, '0');
    const e = String(item.currentEpisode ?? 0).padStart(2, '0');
    let pctStr = '';
    if (item.totalEpisodes && item.totalEpisodes > 0) {
      const pct = Math.round(((item.currentEpisode ?? 0) / item.totalEpisodes) * 100);
      pctStr = ` • ${pct}% completed`;
    }
    return `S${s}E${e}${pctStr}`;
  };

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Currently Active</h2>
      </div>
      
      <div className="grid grid-cols-3 gap-2 md:gap-4 px-2">
        {activeItems.map((item) => {
          try {
            if (!item || !item.title) return null;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                onClick={() => onItemClick(item)}
                className="relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer shadow-lg shadow-black/40 border border-white/10 bg-secondary-accent flex flex-col justify-between"
              >
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-full h-full absolute inset-0 object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 p-2 text-center">
                    {getTypeIcon(item.type)}
                  </div>
                )}
                
                {/* Overlay gradient mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />
                
                {/* Active status top badge */}
                <div className="absolute top-1.5 left-1.5 md:top-2.5 md:left-2.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 md:px-2 md:py-1 rounded-md flex items-center gap-1 border border-white/10 z-10">
                  <span className="text-emerald-400 shrink-0">{getTypeIcon(item.type)}</span>
                  <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-wider">
                    {getTypeLabel(item.type)}
                  </span>
                </div>

                {/* Micro-interaction: Increment Episode by 1 (+1 Ep) */}
                {item.type === MediaType.SHOW && onIncrementEpisode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onIncrementEpisode(item);
                    }}
                    className="absolute top-1.5 right-1.5 md:top-2.5 md:right-2.5 bg-black/70 backdrop-blur-md p-1.5 md:p-2 rounded-md border border-white/10 hover:bg-primary-accent hover:border-primary-accent text-zinc-400 hover:text-app-bg transition-all z-20 group/btn select-none shadow-md"
                    title="Next Episode (+1)"
                  >
                    <Plus size={11} className="md:w-3.5 md:h-3.5 transition-transform group-hover/btn:rotate-90" />
                  </button>
                )}
 
                {/* Typography Bottom Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 z-10 flex flex-col justify-end">
                  <h3 className="font-bold text-white text-[10px] sm:text-xs md:text-sm line-clamp-2 group-hover:text-primary-accent transition-colors leading-tight">
                    {item.title}
                  </h3>
                  {item.type === MediaType.SHOW ? (
                    <p className="text-[8px] sm:text-[9px] md:text-[10px] font-mono mt-1 text-[#576d87] tracking-tight">
                      {formatProgress(item)}
                    </p>
                  ) : (item.platform || item.console) ? (
                    <p className="text-[8px] sm:text-[10px] md:text-xs text-zinc-400 mt-0.5 line-clamp-1">
                      {item.platform || item.console}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            );
          } catch (err) {
            console.error("Error rendering item in ActiveMediaShelf:", item, err);
            return null;
          }
        })}
      </div>
    </div>
  );
};
