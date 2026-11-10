import React from 'react';
import { Clapperboard } from 'lucide-react';
import { MediaItem } from '../types';
import { isCinemaCandidate, useNowPlaying } from '../hooks/useNowPlaying';

interface CinemaBadgeProps {
  item: MediaItem;
  /** "inline" sits next to text, "overlay" is absolutely positioned on a cover. */
  variant?: 'inline' | 'overlay';
  size?: number;
  /** Positioning for the overlay variant. Callers move it below the reminder bell when one is shown. */
  overlayClassName?: string;
}

/**
 * Marks a planned or active movie that runs in German cinemas right now.
 * Renders nothing for other entries or while the cinema list is loading.
 */
export const CinemaBadge: React.FC<CinemaBadgeProps> = ({
  item,
  variant = 'inline',
  size = 11,
  overlayClassName,
}) => {
  const { isTitleInCinema } = useNowPlaying();
  if (!isCinemaCandidate(item) || !isTitleInCinema(item.title)) return null;

  const label = 'Jetzt im Kino';

  if (variant === 'overlay') {
    const position =
      overlayClassName ?? (item.reminderDate ? 'top-7 left-1 md:top-9 md:left-2' : 'top-1 left-1 md:top-2 md:left-2');
    return (
      <div
        title={label}
        className={`absolute ${position} z-10 pointer-events-none bg-black/70 backdrop-blur-sm rounded-full p-1 md:p-1.5 border border-white/10`}
      >
        <Clapperboard size={size} className="text-amber-400" />
      </div>
    );
  }

  return (
    <span title={label} className="inline-flex items-center shrink-0">
      <Clapperboard size={size} className="text-amber-400" />
    </span>
  );
};
