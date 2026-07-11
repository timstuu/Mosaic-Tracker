import React from 'react';
import { motion } from 'motion/react';
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
  return (
    <motion.div
      onClick={() => onEdit?.(item)}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.02] last:border-0 group transition-colors select-none cursor-pointer hover:bg-white/5"
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
    </motion.div>
  );
};
