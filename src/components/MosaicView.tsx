import React from 'react';
import { motion } from 'motion/react';
import { Star, Film, Tv, Book, Gamepad2 } from 'lucide-react';
import { MediaItem, MediaType } from '../types';

interface MosaicViewProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
}

export const MosaicView: React.FC<MosaicViewProps> = ({ items, onItemClick }) => {
  const groupedItems = items.reduce((acc, item) => {
    const date = new Date(item.watchDate || item.endDate || item.dateAdded);
    const currentMonthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[currentMonthYear]) {
      acc[currentMonthYear] = [];
    }
    acc[currentMonthYear].push(item);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  return (
    <div className="space-y-8 p-4 md:p-6">
      {Object.entries(groupedItems).map(([monthYear, monthItems]: [string, MediaItem[]]) => (
        <div key={monthYear}>
          <div className="mb-4 px-2 py-1 border-b border-white/10 text-sm font-bold text-primary-accent uppercase tracking-widest">
            {monthYear}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
            {monthItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer shadow-lg shadow-black/40 border border-white/10"
                onClick={() => onItemClick(item)}
              >
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-zinc-500 p-2 text-center">
                    {item.type === MediaType.MOVIE || item.type === MediaType.DOCUMENTARY ? <Film size={24} className="mb-2" /> : 
                     item.type === MediaType.SERIES ? <Tv size={24} className="mb-2" /> :
                     item.type === MediaType.BOOK ? <Book size={24} className="mb-2" /> : <Gamepad2 size={24} className="mb-2" />}
                    <span className="text-[10px] uppercase tracking-widest line-clamp-2">{item.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="w-full flex justify-between items-center">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={8}
                          className={`${i < item.rating ? 'fill-primary-accent text-primary-accent' : 'text-zinc-700'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
