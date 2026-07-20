import React, { useState, useRef, useEffect } from 'react';
import { MediaItem, MediaType, MediaStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, Book, Gamepad2, Play, Edit2, CheckCircle } from 'lucide-react';

interface ActiveMediaShelfProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onIncrementEpisode?: (item: MediaItem) => void;
  onUpdateMedia?: (item: Partial<MediaItem>) => void;
}

const getTypeIcon = (type: MediaType) => {
  switch (type) {
    case MediaType.SHOW: return <Tv size={13} />;
    case MediaType.BOOK: return <Book size={13} />;
    case MediaType.GAME: return <Gamepad2 size={13} />;
    default: return <Play size={13} />;
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
    pctStr = ` • ${pct}%`;
  }
  return `S${s}E${e}${pctStr}`;
};

const ActiveCard: React.FC<{
  item: MediaItem;
  onItemClick: (item: MediaItem) => void;
  onIncrementEpisode?: (item: MediaItem) => void;
  onUpdateMedia?: (item: Partial<MediaItem>) => void;
}> = React.memo(({ item, onItemClick, onIncrementEpisode, onUpdateMedia }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const startPress = (clientX: number, clientY: number) => {
    setIsPressing(true);
    touchStartPos.current = { x: clientX, y: clientY };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setMenuOpen(true);
      setIsPressing(false);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // ignore sandbox errors
        }
      }
    }, 500); // 500ms long press threshold
  };

  const cancelPress = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
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

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasLongPress = !timerRef.current && !isPressing;
    cancelPress();

    if (!wasLongPress && !menuOpen) {
      // Short click/tap action
      if (item.type === MediaType.SHOW) {
        if (onIncrementEpisode) {
          onIncrementEpisode(item);
        }
      } else {
        onItemClick(item);
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onItemClick(item);
    setMenuOpen(false);
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateMedia) {
      onUpdateMedia({
        ...item,
        status: MediaStatus.COMPLETED,
        endDate: new Date().toISOString().split('T')[0]
      });
    }
    setMenuOpen(false);
  };

  // Long-press cancelation is handled by pointer move detection in handlePointerMove,
  // so no global window scroll event listener is needed.
  useEffect(() => {
    return () => {
      cancelPress();
    };
  }, []);

  return (
    <>
      <motion.div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
        whileTap={{ scale: 0.97 }}
        className={`relative aspect-[2/3] rounded-2xl overflow-hidden group cursor-pointer border border-white/10 flex flex-col justify-between select-none shadow-lg transition-colors ${
          isPressing ? 'bg-white/[0.03]' : 'bg-secondary-accent hover:bg-[#576d87]/10'
        }`}
      >
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full absolute inset-0 object-cover transition-transform duration-500 group-hover:scale-103"
            referrerPolicy="no-referrer"
            draggable="false"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 p-2 text-center absolute inset-0">
            {getTypeIcon(item.type)}
          </div>
        )}
        
        {/* Overlay gradient mask */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />
        
        {/* Active status top badge & episode progress count */}
        <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10 flex flex-col items-start gap-1">
          {item.type === MediaType.SHOW && (
            <div className="bg-black/75 backdrop-blur-md px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border border-white/10 text-[8px] sm:text-[9px] md:text-[9.5px] font-mono text-emerald-400 font-semibold tracking-tight shadow-sm shadow-black/20">
              {formatProgress(item)}
            </div>
          )}
        </div>

        {/* Typography Bottom Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10 flex flex-col justify-end text-left">
          {(item.platform || item.console) ? (
            <p className="text-[8.5px] sm:text-[9.5px] md:text-[10px] text-[#576d87] font-bold tracking-wider uppercase mb-1 line-clamp-1">
              {item.platform || item.console}
            </p>
          ) : null}
          <h3 className="font-bold text-white text-[10.5px] sm:text-xs md:text-sm line-clamp-2 leading-tight">
            {item.title}
          </h3>
        </div>
      </motion.div>

      {/* Pop-up options menu matching the Backlog Tab styling precisely */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
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
                  Active Item Options
                </span>
                <span className="text-xs font-semibold block truncate text-white">
                  {item.title}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1">
                {/* Edit Item Details */}
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full px-4 py-3 flex items-center gap-3 text-xs font-medium rounded-xl hover:bg-white/10 active:bg-white/20 transition-all text-white"
                >
                  <Edit2 size={15} className="text-white/75" />
                  <span>Edit Item Details</span>
                </button>

                {/* Mark as Completed */}
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-full px-4 py-3 flex items-center gap-3 text-xs font-medium rounded-xl hover:bg-white/10 active:bg-white/20 transition-all text-white"
                >
                  <CheckCircle size={15} className="text-emerald-400" />
                  <span>Mark as Completed</span>
                </button>
              </div>

              {/* Cancel label */}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
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
});

export const ActiveMediaShelf: React.FC<ActiveMediaShelfProps> = React.memo(({ 
  items, 
  onItemClick, 
  onIncrementEpisode, 
  onUpdateMedia 
}) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-12 select-none animate-fadeIn">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Currently Active</h2>
      </div>
      
      <div className="grid grid-cols-3 gap-2.5 md:gap-4 px-2">
        {items.map((item) => {
          if (!item || !item.title) return null;
          return (
            <ActiveCard
              key={item.id}
              item={item}
              onItemClick={onItemClick}
              onIncrementEpisode={onIncrementEpisode}
              onUpdateMedia={onUpdateMedia}
            />
          );
        })}
      </div>
    </div>
  );
});
