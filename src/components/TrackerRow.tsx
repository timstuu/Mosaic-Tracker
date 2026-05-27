import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Edit2, Film, Tv, Book, Gamepad2, Star } from 'lucide-react';
import { MediaItem, MediaType, MediaStatus } from '../types';

interface TrackerRowProps {
  item: MediaItem;
  isFirstInMonth: boolean;
  currentMonthYear: string;
  date: Date;
  onEdit: (item: MediaItem) => void;
}

export const TrackerRow: React.FC<TrackerRowProps> = ({
  item,
  isFirstInMonth,
  currentMonthYear,
  date,
  onEdit
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const linkUrl = item.link || (
    (item.type === MediaType.MOVIE || item.type === MediaType.SHOW || item.type === MediaType.DOCUMENTARY) 
      ? 'https://www.werstreamt.es/filme-serien/?q=' + encodeURIComponent(item.title) 
      : `https://www.google.com/search?q=${encodeURIComponent(item.title)}`
  );

  const startPress = (clientX: number, clientY: number) => {
    setIsPressing(true);
    touchStartPos.current = { x: clientX, y: clientY };

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      setIsMenuOpen(true);
      setIsPressing(false);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // ignore sandbox context warning
        }
      }
    }, 500);
  };

  const cancelPress = () => {
    setIsPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    startPress(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPos.current) return;
    const dx = e.clientX - touchStartPos.current.x;
    const dy = e.clientY - touchStartPos.current.y;
    if (Math.hypot(dx, dy) > 8) {
      cancelPress();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      cancelPress();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return (
    <>
      {/* Mobile Month Divider */}
      {isFirstInMonth && (
        <div className="md:hidden px-4 py-2 bg-white/5 border-y border-white/[0.05] text-[10px] font-bold text-[#576d87] uppercase tracking-widest mt-4">
          {currentMonthYear}
        </div>
      )}

      <motion.div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsMenuOpen(true);
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={`flex md:grid md:grid-cols-[140px_60px_48px_1fr_120px] md:items-center px-4 md:px-6 py-4 border-b border-white/[0.02] gap-4 md:gap-0 select-none cursor-pointer transition-colors ${
          isPressing ? 'bg-white/[0.03]' : 'hover:bg-white/5'
        }`}
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
                    <span key={i} className="px-1.5 py-0.5 bg-[#576d87]/10 border border-[#576d87]/20 rounded text-[8px] font-bold text-[#576d87] uppercase tracking-widest">
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

      {/* Elegant minimalist Context Menu modal overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-[#242d3a]/60 backdrop-blur-md"
            />

            {/* Menu Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-[280px] bg-[#576d87] rounded-3xl overflow-hidden p-2.5 shadow-2xl border border-white/10 text-[#e7e7e7]"
            >
              {/* Item Info Header */}
              <div className="px-4 py-3 border-b border-white/10 mb-2">
                <span className="text-[9px] uppercase tracking-wider font-mono text-white/50 block mb-1">
                  Completed Entry
                </span>
                <span className="text-xs font-semibold block truncate text-white">
                  {item.title}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1">
                {/* Open Link */}
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-xs font-medium rounded-xl hover:bg-white/10 active:bg-white/20 transition-all text-[#e7e7e7]"
                >
                  <ExternalLink size={15} className="text-white/75" />
                  <span>Open Link</span>
                </a>

                {/* Edit Entry Details */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(item);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-xs font-medium rounded-xl hover:bg-white/10 active:bg-white/20 transition-all text-white"
                >
                  <Edit2 size={15} className="text-white/75" />
                  <span>Edit Details</span>
                </button>
              </div>

              {/* Close Label */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center text-[10px] uppercase tracking-widest text-white/40 pt-3 pb-1 hover:text-white transition-colors"
              >
                Tap anywhere to cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
