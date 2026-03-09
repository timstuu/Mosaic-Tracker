import React, { useState } from 'react';
import { X, Trophy, Target, Calendar } from 'lucide-react';
import { MediaType, Challenge } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (challenge: Partial<Challenge>) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.MOVIE);
  const [targetCount, setTargetCount] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || targetCount < 1) return;

    onSave({
      id: crypto.randomUUID(),
      name,
      mediaType,
      targetCount,
      startDate,
      endDate,
      dateCreated: new Date().toISOString(),
    });
    
    // Reset form
    setName('');
    setTargetCount(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-secondary-accent border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-accent/20 rounded-xl text-primary-accent">
                <Trophy size={20} />
              </div>
              <h2 className="text-xl font-serif italic text-white">New Challenge</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Challenge Name</label>
              <input
                autoFocus
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026 Movie Marathon"
                className="w-full bg-app-bg border border-white/5 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Media Type</label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as MediaType)}
                  className="w-full bg-app-bg border border-white/5 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-all appearance-none"
                >
                  {Object.values(MediaType).map((type) => (
                    <option key={type} value={type} className="bg-secondary-accent capitalize">
                      {type}s
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Target Count</label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    required
                    type="number"
                    min="1"
                    value={targetCount}
                    onChange={(e) => setTargetCount(parseInt(e.target.value))}
                    className="w-full bg-app-bg border border-white/5 rounded-2xl pl-12 pr-5 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-app-bg border border-white/5 rounded-2xl pl-12 pr-5 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    required
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-app-bg border border-white/5 rounded-2xl pl-12 pr-5 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-accent text-app-bg py-4 rounded-2xl font-bold hover:brightness-110 transition-all shadow-lg shadow-primary-accent/10 mt-4"
            >
              Create Challenge
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
