import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Film, Tv, Book, Gamepad2, Star, Calendar, Monitor, Cpu } from 'lucide-react';
import { MediaType, MediaStatus, MediaItem } from '../types';
import { fetchMediaPoster } from '../services/tmdbService';
import { fetchBookCover } from '../services/bookService';
import { fetchGameCover } from '../services/gameService';

interface EditModalProps {
  item: MediaItem;
  onClose: () => void;
  onSave: (item: Partial<MediaItem>) => void;
  onDelete: (id: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ item, onClose, onSave, onDelete }) => {
  const [type, setType] = useState<MediaType>(item.type);
  const [title, setTitle] = useState(item.title);
  const [status, setStatus] = useState<MediaStatus>(item.status);
  const [rating, setRating] = useState(item.rating || 0);
  const [watchDate, setWatchDate] = useState(item.watchDate || '');
  const [startDate, setStartDate] = useState(item.startDate || '');
  const [endDate, setEndDate] = useState(item.endDate || '');
  const [platform, setPlatform] = useState(item.platform || '');
  const [consoleName, setConsoleName] = useState(item.console || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [tags, setTags] = useState(item.tags || '');
  const [link, setLink] = useState(item.link || '');
  const [isbn, setIsbn] = useState(item.isbn || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let currentImageUrl = item.imageUrl;
    
    // If title or ISBN changed, try to fetch a new cover
    if (title !== item.title || (type === MediaType.BOOK && isbn !== item.isbn)) {
      if ([MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type)) {
        currentImageUrl = await fetchMediaPoster(title, type as any) || currentImageUrl;
      } else if (type === MediaType.BOOK) {
        currentImageUrl = await fetchBookCover(title, isbn) || currentImageUrl;
      } else if (type === MediaType.GAME) {
        currentImageUrl = await fetchGameCover(title) || currentImageUrl;
      }
    }

    const updatedItem: Partial<MediaItem> = {
      ...item,
      title,
      type,
      status,
      rating,
      notes,
      tags,
      imageUrl: currentImageUrl,
      link: link || undefined,
      isbn: type === MediaType.BOOK ? isbn : undefined,
      watchDate: [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type) ? watchDate : undefined,
      startDate: [MediaType.BOOK, MediaType.GAME, MediaType.SERIES].includes(type) ? startDate : undefined,
      endDate: [MediaType.BOOK, MediaType.GAME, MediaType.SERIES].includes(type) ? endDate : undefined,
      platform: [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type) ? platform : undefined,
      console: type === MediaType.GAME ? consoleName : undefined,
    };
    onSave(updatedItem);
  };

  const isVisualMedia = [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type);
  const isInteractiveMedia = [MediaType.BOOK, MediaType.GAME, MediaType.SERIES].includes(type);

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
          <h2 className="text-xl font-semibold text-white">
            {item.status === MediaStatus.PLANNED && status === MediaStatus.COMPLETED ? 'Complete Tracking' : 'Edit Media'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Media Type Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Media Type</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: MediaType.MOVIE, icon: <Film size={18} />, label: 'Movie' },
                { id: MediaType.SERIES, icon: <Tv size={18} />, label: 'Series' },
                { id: MediaType.DOCUMENTARY, icon: <Film size={18} />, label: 'Doc' },
                { id: MediaType.BOOK, icon: <Book size={18} />, label: 'Book' },
                { id: MediaType.GAME, icon: <Gamepad2 size={18} />, label: 'Game' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setType(m.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                    type === m.id 
                      ? 'bg-primary-accent border-primary-accent text-app-bg' 
                      : 'bg-app-bg border-white/10 text-zinc-400 hover:border-primary-accent/50'
                  }`}
                >
                  {m.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-widest mb-2">Title</label>
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
                <label className="block text-xs font-bold text-white uppercase tracking-widest mb-2">Rating</label>
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
                {isVisualMedia && (
                  <div className="grid grid-cols-2 gap-4">
                    {type !== MediaType.SERIES && (
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
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
                    <div className={type === MediaType.SERIES ? "col-span-2" : ""}>
                      <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
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
                  </div>
                )}

                {isInteractiveMedia && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
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
                      <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
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
                )}

                {type === MediaType.GAME && (
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
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

                {type === MediaType.BOOK && (
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
                      <Book size={12} /> ISBN
                    </label>
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="978-..."
                      className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-widest mb-2">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Action, Sci-Fi, Favorite..."
                className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-widest mb-2">Link (Optional)</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-widest mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thoughts, quotes, or reminders..."
                rows={3}
                className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this entry?')) {
                  console.log('EditModal: onDelete triggered for id:', item.id);
                  onDelete(item.id);
                }
              }}
              className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all order-3 sm:order-1"
            >
              Delete
            </button>
            <div className="flex flex-1 gap-3 order-1 sm:order-2">
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
                Update Item
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
