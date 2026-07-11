import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, CheckCircle, Smartphone } from 'lucide-react';
import { MediaItem, MediaType } from '../types';

interface BacklogRowProps {
  item: MediaItem;
  typeIcons: Record<MediaType, React.ReactNode>;
  onMoveToTracker: (item: MediaItem) => void;
  onEdit?: (item: MediaItem) => void;
}

export const BacklogRow: React.FC<BacklogRowProps> = ({
  item,
  typeIcons,
  onMoveToTracker,
  onEdit
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Link resolution logic matching App.tsx
  const linkUrl = item.link || (
    (item.type === MediaType.MOVIE || item.type === MediaType.SHOW || item.type === MediaType.DOCUMENTARY) 
      ? 'https://www.werstreamt.es/filme-serien/?q=' + encodeURIComponent(item.title) 
      : `https://www.google.com/search?q=${encodeURIComponent(item.title)}`
  );

  const startPress = (clientX: number, clientY: number) => {
    setIsPressing(true);
    touchStartPos.current = { x: clientX, y: clientY };

    // Clear any existing timer just in case
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    // Trigger after 500ms
    longPressTimer.current = setTimeout(() => {
      setIsMenuOpen(true);
      setIsPressing(false);
      // Optional subtle vibration feedback if supported
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // ignore sandbox errors
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
    // Only respond to main click/touch
    if (e.button !== 0) return;
    startPress(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPos.current) return;
    const dx = e.clientX - touchStartPos.current.x;
    const dy = e.clientY - touchStartPos.current.y;
    // If user drags/moves finger more than 8 pixels, cancel the press (so scrolling works naturally)
    if (Math.hypot(dx, dy) > 8) {
      cancelPress();
    }
  };

  // Ensure scroll anywhere cancels any pending long-press
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
      <motion.div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        // Right-click support on desktop for accessibility and speed
        onContextMenu={(e) => {
          e.preventDefault();
          setIsMenuOpen(true);
        }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className={`flex items-center gap-4 px-6 py-4 border-b border-white/[0.02] last:border-0 group transition-colors select-none cursor-pointer ${
          isPressing ? 'bg-white/[0.03]' : 'hover:bg-white/5'
        }`}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 pointer-events-none">
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.title} 
              referrerPolicy="no-referrer"
              className="w-10 h-14 object-cover rounded shadow-lg border border-white/10"
            />
          ) : (
            <div className="w-10 h-14 bg-white/5 rounded border border-white/5 flex items-center justify-center text-zinc-300">
              {typeIcons[item.type]}
            </div>
          )}
        </div>

        {/* Info - Pure typography, highly clean */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="text-sm font-medium text-white group-hover:text-primary-accent transition-colors truncate">
            {item.title}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {(item.platform || item.console) && (
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                {item.platform || item.console}
              </span>
            )}
            <span className="text-[10px] text-zinc-600 font-mono">
              Added {new Date(item.dateAdded).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Desktop Helper Text - subtle touch hint when hovered */}
        <div className="hidden lg:block text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity font-mono pr-2 pointer-events-none">
          Hold / Right-Click to manage
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
                  Manage Backlog
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

                {/* Mark as Tracked */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMoveToTracker(item);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-xs font-medium rounded-xl hover:bg-white/10 active:bg-white/20 transition-all text-white"
                >
                  <CheckCircle size={15} className="text-emerald-400" />
                  <span>Mark as Tracked</span>
                </button>

                {/* Optional Edit - if supported, let's keep it clean */}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(item);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-xs font-medium rounded-xl hover:bg-white/10 active:bg-white/20 transition-all text-white/80"
                  >
                    <Smartphone size={15} className="text-white/60" />
                    <span>Edit Item Details</span>
                  </button>
                )}
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
