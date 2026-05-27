import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Film, Tv, Book, Gamepad2, Star, Calendar, Monitor, Cpu } from 'lucide-react';
import { MediaType, MediaItem, MediaStatus } from '../types';

interface MediaFormProps {
  onClose: () => void;
  onSave: (item: Partial<MediaItem>) => void;
}

export const MediaForm: React.FC<MediaFormProps> = ({ onClose, onSave }) => {
  const [type, setType] = useState<MediaType>(MediaType.MOVIE);
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(0);
  const [watchDate, setWatchDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [platform, setPlatform] = useState('');
  const [consoleName, setConsoleName] = useState('');
  const [notes, setNotes] = useState('');
  const [isDnf, setIsDnf] = useState(false);

  const isVisualMedia = [MediaType.MOVIE, MediaType.DOCUMENTARY].includes(type);
  const isInteractiveMedia = [MediaType.BOOK, MediaType.GAME, MediaType.SHOW].includes(type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Automatically calculate status based on date fields
    let derivedStatus = MediaStatus.PLANNED;
    if (isVisualMedia) {
      if (watchDate) {
        derivedStatus = MediaStatus.COMPLETED;
      }
    } else if (isInteractiveMedia) {
      if (isDnf) {
        derivedStatus = MediaStatus.DNF;
      } else if (endDate) {
        derivedStatus = MediaStatus.COMPLETED;
      } else if (startDate) {
        derivedStatus = MediaStatus.ACTIVE;
      }
    }

    const newItem: Partial<MediaItem> = {
      id: crypto.randomUUID(),
      title,
      type,
      status: derivedStatus,
      rating,
      dateAdded: new Date().toISOString(),
      notes,
      watchDate: isVisualMedia ? (watchDate || undefined) : undefined,
      startDate: isInteractiveMedia ? (startDate || undefined) : undefined,
      endDate: isInteractiveMedia ? (endDate || undefined) : undefined,
      platform: [MediaType.MOVIE, MediaType.SHOW, MediaType.DOCUMENTARY].includes(type) ? (platform || undefined) : undefined,
      console: type === MediaType.GAME ? (consoleName || undefined) : undefined,
    };
    onSave(newItem);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-secondary-accent border border-white/5 rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-secondary-accent/50">
          <h2 className="text-xl font-semibold text-white">Add New Media</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors" title="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Media Type Selector */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: MediaType.MOVIE, icon: <Film size={18} />, label: 'Movie' },
              { id: MediaType.SHOW, icon: <Tv size={18} />, label: 'Show' },
              { id: MediaType.DOCUMENTARY, icon: <Film size={18} />, label: 'Doc' },
              { id: MediaType.BOOK, icon: <Book size={18} />, label: 'Book' },
              { id: MediaType.GAME, icon: <Gamepad2 size={18} />, label: 'Game' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                  type === item.id 
                    ? 'bg-primary-accent border-primary-accent text-app-bg' 
                    : 'bg-app-bg border-white/10 text-zinc-400 hover:border-primary-accent/50'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Title</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
              />
            </div>



            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Rating</label>
                <div className="flex items-center h-[50px] gap-1 px-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1"
                    >
                      <Star 
                        size={20} 
                        className={`${s <= rating ? 'fill-primary-accent text-primary-accent' : 'text-white/10'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Fields */}
            <AnimatePresence mode="wait">
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Watch Date for strictly Movie & Documentary */}
                {(type === MediaType.MOVIE || type === MediaType.DOCUMENTARY) && (
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      <Calendar size={12} /> Watch Date
                    </label>
                    <input
                      type="date"
                      value={watchDate}
                      onChange={(e) => setWatchDate(e.target.value)}
                      className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                    />
                  </div>
                )}

                {/* For Games, Books, and Shows: Start Date & End Date */}
                {(type === MediaType.GAME || type === MediaType.BOOK || type === MediaType.SHOW) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                          <Calendar size={12} /> Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                          <Calendar size={12} /> End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Did Not Finish Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsDnf(!isDnf)}
                        className={`w-full py-3.5 px-4 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          isDnf 
                            ? 'bg-[#6b1e1e]/20 border-[#6b1e1e]/60 text-red-400 hover:bg-[#6b1e1e]/30' 
                            : 'bg-app-bg border-white/10 text-zinc-400 hover:border-red-500/30 hover:text-red-400'
                        }`}
                      >
                        <X size={14} className={isDnf ? "animate-pulse" : ""} />
                        <span>{isDnf ? 'Did Not Finish (DNF)' : 'Mark as "Did Not Finish" (DNF)'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Platform for Movie, Show, Documentary */}
                {[MediaType.MOVIE, MediaType.SHOW, MediaType.DOCUMENTARY].includes(type) && (
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      <Monitor size={12} /> Platform
                    </label>
                    <input
                      type="text"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      placeholder="Netflix, HBO..."
                      className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                    />
                  </div>
                )}

                {type === MediaType.GAME && (
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      <Cpu size={12} /> Console
                    </label>
                    <input
                      type="text"
                      value={consoleName}
                      onChange={(e) => setConsoleName(e.target.value)}
                      placeholder="PS5, Xbox, Switch..."
                      className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thoughts, quotes, or reminders..."
                rows={3}
                className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-app-bg text-white border border-white/10 rounded-2xl font-bold hover:bg-secondary-accent transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-primary-accent text-app-bg rounded-2xl font-bold hover:brightness-110 transition-all shadow-lg shadow-primary-accent/10"
            >
              Save Item
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
