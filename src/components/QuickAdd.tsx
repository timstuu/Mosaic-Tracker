import React, { useState } from 'react';
import { X, Film, Tv, Book, Gamepad2, Star, Plus } from 'lucide-react';
import { MediaType, MediaItem, MediaStatus } from '../types';
import { fetchMediaPoster } from '../services/tmdbService';
import { fetchBookCover } from '../services/bookService';
import { fetchGameCover } from '../services/gameService';

interface QuickAddProps {
  onSave: (item: Partial<MediaItem>) => void;
}

export const QuickAdd: React.FC<QuickAddProps> = ({ onSave }) => {
  const [type, setType] = useState<MediaType>(MediaType.MOVIE);
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(0);
  const [watchDate, setWatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [platform, setPlatform] = useState('');
  const [consoleName, setConsoleName] = useState('');
  const [tags, setTags] = useState('');
  const [isbn, setIsbn] = useState('');

  const isVisual = [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type);
  const isInteractive = [MediaType.BOOK, MediaType.GAME, MediaType.SERIES].includes(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    let imageUrl = undefined;
    if ([MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type)) {
      imageUrl = await fetchMediaPoster(title, type as any);
    } else if (type === MediaType.BOOK) {
      imageUrl = await fetchBookCover(title, isbn);
    } else if (type === MediaType.GAME) {
      imageUrl = await fetchGameCover(title);
    }

    let finalStatus = MediaStatus.COMPLETED;
    if (isVisual && type !== MediaType.SERIES) {
      if (!watchDate) finalStatus = MediaStatus.PLANNED;
    } else if (isInteractive) {
      if (!endDate) finalStatus = MediaStatus.PLANNED;
    }

    const newItem: Partial<MediaItem> = {
      id: crypto.randomUUID(),
      title,
      type,
      status: finalStatus,
      rating,
      dateAdded: new Date().toISOString(),
      watchDate: [MediaType.MOVIE, MediaType.DOCUMENTARY].includes(type) ? (watchDate || undefined) : undefined,
      startDate: [MediaType.BOOK, MediaType.GAME, MediaType.SERIES].includes(type) ? (startDate || undefined) : undefined,
      endDate: [MediaType.BOOK, MediaType.GAME, MediaType.SERIES].includes(type) ? (endDate || undefined) : undefined,
      platform: [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type) ? platform : undefined,
      console: type === MediaType.GAME ? consoleName : undefined,
      tags: [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY, MediaType.GAME, MediaType.BOOK].includes(type) ? tags : undefined,
      imageUrl,
      isbn: type === MediaType.BOOK ? isbn : undefined,
    };

    onSave(newItem);
    setTitle('');
    setRating(0);
    setPlatform('');
    setConsoleName('');
    setStartDate('');
    setEndDate('');
    setWatchDate('');
    setTags('');
    setIsbn('');
  };

  return (
    <div className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20 mb-12">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Type Selection */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">What are you tracking?</label>
          <div className="flex bg-app-bg rounded-xl p-1 border border-white/5 w-fit">
            {[
              { id: MediaType.MOVIE, icon: <Film size={14} /> },
              { id: MediaType.SERIES, icon: <Tv size={14} /> },
              { id: MediaType.DOCUMENTARY, icon: <Film size={14} /> },
              { id: MediaType.BOOK, icon: <Book size={14} /> },
              { id: MediaType.GAME, icon: <Gamepad2 size={14} /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                className={`p-2 rounded-lg transition-all ${
                  type === item.id 
                    ? 'bg-primary-accent text-app-bg shadow-lg' 
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Title & ISBN */}
        <div className={`grid gap-4 ${type === MediaType.BOOK ? 'grid-cols-1 md:grid-cols-[1fr_200px]' : 'grid-cols-1'}`}>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
              className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
            />
          </div>
          {type === MediaType.BOOK && (
            <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
              <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">ISBN (Optional)</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-..."
                className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Row 3: Dates & Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-end gap-4">
          {(isVisual && type !== MediaType.SERIES) && (
            <div className="flex-1 space-y-2">
              <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Watch Date</label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={watchDate}
                  onChange={(e) => setWatchDate(e.target.value)}
                  className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                />
                {watchDate && (
                  <button
                    type="button"
                    onClick={() => setWatchDate('')}
                    className="p-2 text-zinc-500 hover:text-white bg-app-bg border border-white/5 rounded-xl transition-colors shrink-0"
                    title="Clear date"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {isInteractive && (
            <>
              <div className="flex-1 space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Start Date</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                  />
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => setStartDate('')}
                      className="p-2 text-zinc-500 hover:text-white bg-app-bg border border-white/5 rounded-xl transition-colors shrink-0"
                      title="Clear date"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">End Date</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                  />
                  {endDate && (
                    <button
                      type="button"
                      onClick={() => setEndDate('')}
                      className="p-2 text-zinc-500 hover:text-white bg-app-bg border border-white/5 rounded-xl transition-colors shrink-0"
                      title="Clear date"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="w-full md:w-auto space-y-2">
            <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Rating</label>
            <div className="flex items-center justify-center bg-app-bg border border-white/5 rounded-xl px-3 py-2 gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="transition-transform active:scale-125"
                >
                  <Star 
                    size={14} 
                    className={`${s <= rating ? 'fill-primary-accent text-primary-accent' : 'text-white/10'}`} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: Platform, Console & Tags */}
        {(isVisual || type === MediaType.GAME || type === MediaType.BOOK) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
            {isVisual && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Streaming Service</label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="Netflix, HBO..."
                  className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                />
              </div>
            )}
            {type === MediaType.GAME && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Console</label>
                <input
                  type="text"
                  value={consoleName}
                  onChange={(e) => setConsoleName(e.target.value)}
                  placeholder="PS5, Xbox..."
                  className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                />
              </div>
            )}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Tags (e.g. Cinema, With Friends)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Add tags separated by commas..."
                className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Row 5: Submit Button */}
        <button
          type="submit"
          disabled={!title}
          className="w-full bg-primary-accent text-app-bg py-4 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-accent/10 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          <span>Add Entry</span>
        </button>
      </form>
    </div>
  );
};
