import React from 'react';
import { MediaItem, MediaType } from '../types';
import { motion } from 'motion/react';
import { Tv, Book, Gamepad2, Play } from 'lucide-react';

interface ActiveMediaShelfProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
}

export const ActiveMediaShelf: React.FC<ActiveMediaShelfProps> = ({ items, onItemClick }) => {
  const activeItems = items.filter(
    (item) => item.startDate && !item.endDate && [MediaType.SERIES, MediaType.BOOK, MediaType.GAME].includes(item.type)
  );

  if (activeItems.length === 0) return null;

  const getTypeIcon = (type: MediaType) => {
    switch (type) {
      case MediaType.SERIES: return <Tv size={14} />;
      case MediaType.BOOK: return <Book size={14} />;
      case MediaType.GAME: return <Gamepad2 size={14} />;
      default: return <Play size={14} />;
    }
  };

  const getTypeLabel = (type: MediaType) => {
    switch (type) {
      case MediaType.SERIES: return 'Watching';
      case MediaType.BOOK: return 'Reading';
      case MediaType.GAME: return 'Playing';
      default: return 'Active';
    }
  };

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Currently Active</h2>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
        {activeItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            onClick={() => onItemClick(item)}
            className="flex-none w-40 sm:w-48 cursor-pointer group snap-start"
          >
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-secondary-accent border border-white/5 shadow-lg mb-3">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                  {getTypeIcon(item.type)}
                  <span className="text-xs font-medium uppercase tracking-widest">{item.type}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5 border border-white/10">
                <span className="text-emerald-400">{getTypeIcon(item.type)}</span>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {getTypeLabel(item.type)}
                </span>
              </div>
            </div>
            
            <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-primary-accent transition-colors">
              {item.title}
            </h3>
            {item.platform && (
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{item.platform}</p>
            )}
            {item.console && (
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{item.console}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
