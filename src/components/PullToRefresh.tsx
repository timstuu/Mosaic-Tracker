import React, { useState, useRef, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAX_PULL = 120;
  const THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      startYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
    }
  };

  const handleTouchEnd = async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (!isDraggingRef.current || isRefreshing) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;

      if (distance > 0 && window.scrollY <= 0) {
        e.preventDefault(); // Prevent native overscroll/refresh
        setPullDistance(Math.min(distance * 0.4, MAX_PULL));
      }
    };

    container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    return () => container.removeEventListener('touchmove', handleTouchMoveNative);
  }, [isRefreshing]);

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full w-full"
    >
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-start pt-6 overflow-hidden transition-all duration-200 z-0"
        style={{ 
          height: `${isRefreshing ? THRESHOLD : pullDistance}px`,
          opacity: Math.min((pullDistance / THRESHOLD) * 1.5, 1)
        }}
      >
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 text-primary-accent animate-spin" />
        ) : (
          <div className="flex items-center gap-2 text-zinc-400">
            <RefreshCw 
              className="w-5 h-5 transition-transform" 
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {pullDistance >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>
      <div 
        className="transition-transform duration-200 relative z-10 min-h-full"
        style={{ transform: `translateY(${isRefreshing ? THRESHOLD : pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
