import React from 'react';
import { motion } from 'motion/react';
import { Film, Tv, Book, Gamepad2, Star } from 'lucide-react';
import { MediaItem, MediaType, MediaStatus } from '../types';

interface TrackerRowProps {
  item: MediaItem;
  isFirstInMonth: boolean;
  currentMonthYear: string;
  date: Date;
  onEdit: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
}

export const TrackerRow: React.FC<TrackerRowProps> = ({
  item,
  isFirstInMonth,
  currentMonthYear,
  date,
  onEdit,
  onTagClick
}) => {
  return (
    <>
      {/* Mobile Month Divider */}
      {isFirstInMonth && (
        <div className="md:hidden px-4 py-2 bg-white/5 border-y border-white/[0.05] text-[10px] font-bold text-[#576d87] uppercase tracking-widest mt-4">
          {currentMonthYear}
        </div>
      )}

      <motion.div
        onClick={() => onEdit(item)}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="flex md:grid md:grid-cols-[140px_60px_48px_1fr_120px] md:items-center px-4 md:px-6 py-4 border-b border-white/[0.02] gap-4 md:gap-0 select-none cursor-pointer transition-colors hover:bg-white/5"
      >
        {/* Desktop Period Column */}
        <div className="hidden md:block text-sm font-serif italic text-[#576d87]">
          {isFirstInMonth ? currentMonthYear : ""}
        </div>
        
        {/* Day Column */}
        <div className="text-sm font-mono text-white w-8 md:w-auto shrink-0">
          {date.getDate().toString().padStart(2, '0')}
        </div>

        {/* Cover Art Thumbnail */}
        <div className="flex items-center justify-center shrink-0 relative">
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.title} 
              referrerPolicy="no-referrer"
              className="w-8 h-12 object-cover rounded shadow-lg shadow-black/40 border border-white/10"
            />
          ) : (
            <div className="w-8 h-12 bg-white/5 rounded border border-white/5 flex items-center justify-center text-zinc-300">
              {item.type === MediaType.MOVIE || item.type === MediaType.DOCUMENTARY ? <Film size={14} /> : 
               item.type === MediaType.SHOW ? <Tv size={14} /> :
               item.type === MediaType.BOOK ? <Book size={14} /> : <Gamepad2 size={14} />}
            </div>
          )}
          {item.status === MediaStatus.DNF && (
            <div className="absolute inset-0 bg-red-950/70 border border-red-500/20 rounded flex items-center justify-center">
              <span className="text-[8px] font-bold text-red-200 tracking-wider">DNF</span>
            </div>
          )}
        </div>
        
        {/* Title & Rating Container */}
        <div className="flex-1 md:contents">
          <div className="flex flex-col md:flex-row md:items-start md:py-1 gap-1 md:gap-4 md:pr-4">
            <div className="flex flex-col md:flex-row md:items-baseline gap-2">
              <span className="text-sm font-medium text-white group-hover:text-white/90 transition-colors whitespace-normal break-words">
                {item.title}
              </span>
              {item.status === MediaStatus.DNF && (
                <span className="px-1.5 py-0.5 bg-red-900/30 border border-red-500/20 rounded text-[8px] font-extrabold text-red-400 tracking-widest uppercase inline-block w-fit">
                  DNF
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(item.startDate && item.endDate) && (
                <div className="text-[10px] text-white font-mono whitespace-nowrap">
                  {new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}
                </div>
              )}
              {(item.platform || item.console) && (
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  {item.platform || item.console}
                </span>
              )}
              {item.tags && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.split(',').map((tag, i) => (
                    <span 
                      key={i} 
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagClick?.(tag.trim());
                      }}
                      className="px-1.5 py-0.5 bg-[#576d87]/10 hover:bg-[#576d87]/25 border border-[#576d87]/20 hover:border-[#576d87]/45 rounded text-[8px] font-bold text-[#576d87] hover:text-[#e7e7e7] transition-all uppercase tracking-widest cursor-pointer"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex md:justify-end items-center gap-2 mt-1 md:mt-0">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10}
                  className={`${i < (item.rating || 0) ? 'fill-[#576d87] text-[#576d87]' : 'text-zinc-700'}`} 
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
