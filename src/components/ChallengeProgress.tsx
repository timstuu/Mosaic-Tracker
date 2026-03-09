import React from 'react';
import { Trophy, Target, Calendar, Film, Tv, Book, Gamepad2, ChevronRight, Plus } from 'lucide-react';
import { MediaItem, MediaType, Challenge } from '../types';
import { motion } from 'motion/react';

interface ChallengeProgressProps {
  challenges: Challenge[];
  items: MediaItem[];
  onViewAll: () => void;
  onAddChallenge: () => void;
}

export const ChallengeProgress: React.FC<ChallengeProgressProps> = ({ challenges, items, onViewAll, onAddChallenge }) => {
  const activeChallenges = challenges.filter(challenge => {
    const end = new Date(challenge.endDate);
    return end >= new Date();
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  if (activeChallenges.length === 0) {
    return (
      <div className="mb-12">
        <button 
          onClick={onAddChallenge}
          className="w-full py-6 bg-secondary-accent/30 border border-white/5 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 group hover:bg-secondary-accent/50 transition-all"
        >
          <Trophy size={24} className="text-zinc-700 group-hover:text-primary-accent transition-colors" />
          <span className="text-xs font-serif italic text-white group-hover:text-primary-accent">No active challenges. Start one?</span>
        </button>
      </div>
    );
  }

  const typeIcons = {
    [MediaType.MOVIE]: <Film size={12} />,
    [MediaType.SERIES]: <Tv size={12} />,
    [MediaType.DOCUMENTARY]: <Film size={12} />,
    [MediaType.BOOK]: <Book size={12} />,
    [MediaType.GAME]: <Gamepad2 size={12} />,
  };

  return (
    <div className="mb-12 space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-primary-accent" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Active Challenges</h3>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onAddChallenge}
            className="p-1 text-zinc-500 hover:text-primary-accent transition-colors"
            title="New Challenge"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={onViewAll}
            className="text-[10px] font-bold text-primary-accent uppercase tracking-widest flex items-center gap-1 hover:brightness-110 transition-all"
          >
            View All <ChevronRight size={10} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeChallenges.slice(0, 2).map(challenge => {
          const progressCount = items.filter(item => {
            if (item.type !== challenge.mediaType) return false;
            
            const completionDate = new Date(item.watchDate || item.endDate || item.dateAdded);
            const start = new Date(challenge.startDate);
            const end = new Date(challenge.endDate);
            
            return completionDate >= start && completionDate <= end;
          }).length;

          const progressPercent = Math.min(100, (progressCount / challenge.targetCount) * 100);
          const daysLeft = Math.ceil((new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

          return (
            <div key={challenge.id} className="bg-secondary-accent/50 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-primary-accent/60">{typeIcons[challenge.mediaType]}</div>
                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                      {challenge.mediaType}
                    </span>
                  </div>
                  <h4 className="text-sm font-serif italic text-white truncate max-w-[180px]">{challenge.name}</h4>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-white">{progressCount} / {challenge.targetCount}</div>
                  <div className="text-[8px] text-white uppercase tracking-widest">{daysLeft}d left</div>
                </div>
              </div>

              <div className="relative h-1.5 bg-app-bg rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className={`absolute inset-y-0 left-0 rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary-accent'}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
