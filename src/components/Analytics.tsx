import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  AreaChart, Area 
} from 'recharts';
import { MediaItem, MediaType, Challenge, MediaStatus } from '../types';
import { Star, TrendingUp, LayoutGrid, Award, Trophy, Plus, Trash2, Calendar, Target, Film, Tv, Book, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnalyticsProps {
  items: MediaItem[];
  challenges: Challenge[];
  onAddChallenge: () => void;
  onDeleteChallenge: (id: string) => void;
  onItemClick?: (item: MediaItem) => void;
}

const COLORS = ['#DFD0B8', '#393E46', '#5C8374', '#9EC8B9', '#1B262C'];

import { MosaicView } from './MosaicView';
import { X } from 'lucide-react';

export const Analytics: React.FC<AnalyticsProps> = ({ items, challenges, onAddChallenge, onDeleteChallenge, onItemClick }) => {
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);

  const stats = useMemo(() => {
    const completedItems = items.filter(item => {
      if (item.status !== MediaStatus.COMPLETED) return false;
      if ([MediaType.SERIES, MediaType.BOOK, MediaType.GAME].includes(item.type)) {
        return !!item.endDate;
      }
      return !!item.watchDate;
    });

    if (completedItems.length === 0) return null;

    // 1. Media Type Distribution
    const typeDistribution = Object.values(MediaType).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: completedItems.filter(item => item.type === type).length
    })).filter(d => d.value > 0);

    // 2. Rating Distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating: `${rating} Stars`,
      count: completedItems.filter(item => item.rating === rating).length
    }));

    // 3. Activity by Month
    const activityByMonth: Record<string, number> = {};
    completedItems.forEach(item => {
      const date = new Date(item.watchDate || item.endDate || item.dateAdded);
      const key = date.toLocaleString('default', { month: 'short' });
      activityByMonth[key] = (activityByMonth[key] || 0) + 1;
    });
    
    const activityData = Object.entries(activityByMonth).map(([name, count]) => ({
      name,
      count
    }));

    // 4. Summary Stats
    const totalItems = completedItems.length;
    
    const ratedItems = completedItems.filter(item => item.rating > 0);
    const avgRating = ratedItems.length > 0 
      ? (ratedItems.reduce((acc, item) => acc + item.rating, 0) / ratedItems.length).toFixed(1)
      : '0.0';
      
    const topType = [...typeDistribution].sort((a, b) => b.value - a.value)[0]?.name || 'N/A';

    return {
      typeDistribution,
      ratingDistribution,
      activityData,
      totalItems,
      avgRating,
      topType
    };
  }, [items]);

  const challengeStats = useMemo(() => {
    return challenges.map(challenge => {
      const challengeItems = items.filter(item => {
        if (item.type !== challenge.mediaType) return false;
        if (item.status !== MediaStatus.COMPLETED) return false;
        
        if ([MediaType.SERIES, MediaType.BOOK, MediaType.GAME].includes(item.type)) {
          if (!item.endDate) return false;
        } else {
          if (!item.watchDate) return false;
        }
        
        const completionDate = new Date(item.watchDate || item.endDate || item.dateAdded);
        const start = new Date(challenge.startDate);
        const end = new Date(challenge.endDate);
        
        return completionDate >= start && completionDate <= end;
      }).sort((a, b) => {
        const dateA = new Date(a.watchDate || a.endDate || a.dateAdded).getTime();
        const dateB = new Date(b.watchDate || b.endDate || b.dateAdded).getTime();
        return dateB - dateA;
      });

      const progressCount = challengeItems.length;
      const progressPercent = Math.min(100, (progressCount / challenge.targetCount) * 100);
      const isCompleted = progressCount >= challenge.targetCount;
      const daysLeft = Math.ceil((new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...challenge,
        progressCount,
        progressPercent,
        isCompleted,
        daysLeft,
        items: challengeItems
      };
    });
  }, [challenges, items]);

  const renderOverview = () => {
    if (!stats) {
      return (
          <div className="py-20 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="text-zinc-300" />
          </div>
          <p className="text-white font-serif italic">Not enough data for analytics yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Tracked', value: stats.totalItems, icon: <LayoutGrid size={16} /> },
            { label: 'Avg Rating', value: stats.avgRating, icon: <Star size={16} /> },
            { label: 'Top Category', value: stats.topType, icon: <Award size={16} /> },
            { label: 'Growth', value: '+12%', icon: <TrendingUp size={16} /> },
          ].map((stat, i) => (
            <div key={i} className="bg-secondary-accent border border-white/5 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 text-white mb-1">
                {stat.icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
              </div>
              <div className="text-xl font-serif italic text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Type Distribution */}
          <div className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Media Distribution</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1B262C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#DFD0B8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {stats.typeDistribution.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Activity Trend</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.activityData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DFD0B8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#DFD0B8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1B262C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#DFD0B8' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#DFD0B8" 
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl md:col-span-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Rating Distribution</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="rating" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1B262C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#DFD0B8' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#DFD0B8" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChallenges = () => {
    const typeIcons = {
      [MediaType.MOVIE]: <Film size={14} />,
      [MediaType.SERIES]: <Tv size={14} />,
      [MediaType.DOCUMENTARY]: <Film size={14} />,
      [MediaType.BOOK]: <Book size={14} />,
      [MediaType.GAME]: <Gamepad2 size={14} />,
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Active Challenges</h3>
          <button 
            onClick={onAddChallenge}
            className="flex items-center gap-2 px-4 py-2 bg-primary-accent text-app-bg rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-primary-accent/10"
          >
            <Plus size={14} />
            New Challenge
          </button>
        </div>

        {challengeStats.length === 0 ? (
          <div className="py-20 text-center bg-secondary-accent/30 rounded-3xl border border-white/5 border-dashed">
            <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-300 font-serif italic">No challenges set yet. Start your first goal!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challengeStats.map((challenge) => (
              <motion.div 
                layout
                key={challenge.id}
                onClick={() => setSelectedChallenge(challenge)}
                className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group cursor-pointer hover:bg-secondary-accent/80 transition-colors"
              >
                {challenge.isCompleted && (
                  <div className="absolute top-0 right-0 p-4">
                    <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                      <Award size={16} />
                    </div>
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-primary-accent/60">{typeIcons[challenge.mediaType]}</div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                        {challenge.mediaType} Challenge
                      </span>
                    </div>
                    <h4 className="text-lg font-serif italic text-white">{challenge.name}</h4>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChallenge(challenge.id);
                    }}
                    className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Target size={12} className="text-primary-accent" />
                      <span>{challenge.progressCount} / {challenge.targetCount} {challenge.mediaType}s</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar size={12} className="text-primary-accent" />
                      <span>{challenge.daysLeft > 0 ? `${challenge.daysLeft} days left` : 'Ended'}</span>
                    </div>
                  </div>

                  <div className="relative h-2 bg-app-bg rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${challenge.progressPercent}%` }}
                      className={`absolute inset-y-0 left-0 rounded-full ${challenge.isCompleted ? 'bg-emerald-500' : 'bg-primary-accent'}`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-white font-mono">
                    <span>{new Date(challenge.startDate).toLocaleDateString()}</span>
                    <span className="font-bold text-primary-accent">{Math.round(challenge.progressPercent)}%</span>
                    <span>{new Date(challenge.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-16 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-serif italic text-white mb-2">Analytics</h1>
        <p className="text-white text-sm">Track your progress and media consumption trends.</p>
      </div>

      {/* Challenges Section */}
      <section>
        {renderChallenges()}
      </section>

      {/* Overview Section */}
      <section className="space-y-8">
        <div className="border-t border-white/5 pt-12 mb-8">
          <h2 className="text-2xl font-serif italic text-white mb-2">Insights</h2>
          <p className="text-white text-sm">A visual overview of your media consumption journey.</p>
        </div>
        {renderOverview()}
      </section>

      <AnimatePresence>
        {selectedChallenge && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChallenge(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-app-bg border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-secondary-accent/50">
                <div>
                  <h2 className="text-2xl font-serif italic text-white">{selectedChallenge.name}</h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    {selectedChallenge.progressCount} / {selectedChallenge.targetCount} {selectedChallenge.mediaType}s completed
                  </p>
                </div>
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {selectedChallenge.items.length > 0 ? (
                  <MosaicView 
                    items={selectedChallenge.items} 
                    onItemClick={(item) => {
                      setSelectedChallenge(null);
                      if (onItemClick) onItemClick(item);
                    }} 
                  />
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-zinc-400 font-serif italic">No entries completed for this challenge yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
