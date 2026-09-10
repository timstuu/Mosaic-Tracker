import React from 'react';
import { Bell } from 'lucide-react';
import { MediaItem } from '../types';

interface ReminderBellProps {
  item: MediaItem;
  /** "inline" sits next to text, "overlay" is absolutely positioned on a cover. */
  variant?: 'inline' | 'overlay';
  size?: number;
  /** Positioning for the overlay variant — covers differ in what already occupies a corner. */
  overlayClassName?: string;
}

/**
 * Marks an entry that has a reminder set. Renders nothing when there is none.
 * A reminder that has already been sent is muted rather than hidden, so the
 * entry does not silently lose its marker the moment the push goes out.
 */
export const ReminderBell: React.FC<ReminderBellProps> = ({
  item,
  variant = 'inline',
  size = 11,
  overlayClassName = 'top-1 left-1 md:top-2 md:left-2',
}) => {
  if (!item.reminderDate) return null;

  const pending = !item.reminderSentAt;
  const date = new Date(item.reminderDate);
  const label = `Reminder ${isNaN(date.getTime()) ? item.reminderDate : date.toLocaleDateString()} · ${
    item.reminderTime || '09:00'
  }${pending ? '' : ' (sent)'}`;

  if (variant === 'overlay') {
    return (
      <div
        title={label}
        className={`absolute ${overlayClassName} z-10 pointer-events-none bg-black/70 backdrop-blur-sm rounded-full p-1 md:p-1.5 border border-white/10`}
      >
        <Bell size={size} className={pending ? 'text-primary-accent' : 'text-zinc-500'} />
      </div>
    );
  }

  return (
    <span title={label} className="inline-flex items-center shrink-0">
      <Bell size={size} className={pending ? 'text-primary-accent' : 'text-zinc-600'} />
    </span>
  );
};
