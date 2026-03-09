import React, { useState } from 'react';
import { Film, Tv, Book, Gamepad2, Link as LinkIcon, Plus } from 'lucide-react';
import { MediaType, MediaItem, MediaStatus } from '../types';
import { fetchMediaPoster } from '../services/tmdbService';
import { fetchBookCover } from '../services/bookService';
import { fetchGameCover } from '../services/gameService';

interface BacklogAddProps {
  onSave: (item: Partial<MediaItem>) => void;
}

export const BacklogAdd: React.FC<BacklogAddProps> = ({ onSave }) => {
  const [type, setType] = useState<MediaType>(MediaType.MOVIE);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [consoleName, setConsoleName] = useState('');
  const [link, setLink] = useState('');
  const [isbn, setIsbn] = useState('');
  const [notes, setNotes] = useState('');

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

    const newItem: Partial<MediaItem> = {
      id: crypto.randomUUID(),
      title,
      type,
      status: MediaStatus.PLANNED,
      rating: 0,
      dateAdded: new Date().toISOString(),
      platform: [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type) ? platform : undefined,
      console: type === MediaType.GAME ? consoleName : undefined,
      link: link || undefined,
      imageUrl,
      isbn: type === MediaType.BOOK ? isbn : undefined,
      notes: notes || undefined,
    };

    onSave(newItem);
    setTitle('');
    setPlatform('');
    setConsoleName('');
    setLink('');
    setIsbn('');
    setNotes('');
  };

  const isVisual = [MediaType.MOVIE, MediaType.SERIES, MediaType.DOCUMENTARY].includes(type);

  return (
    <div className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20 mb-12">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Type Selection */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">What's next on your list?</label>
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

        {/* Row 2: Title */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Title</label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to watch/read/play?"
            className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
          />
        </div>

        {/* Row 3: Platform, Console & Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(isVisual || type === MediaType.GAME) && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">
                {isVisual ? 'Streaming Service' : 'Console'}
              </label>
              <input
                type="text"
                value={isVisual ? platform : consoleName}
                onChange={(e) => isVisual ? setPlatform(e.target.value) : setConsoleName(e.target.value)}
                placeholder={isVisual ? "Netflix, HBO..." : "PS5, Xbox..."}
                className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
              />
            </div>
          )}
          
          <div className="space-y-2 flex-1">
            <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Link (Optional)</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-3 h-3" />
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full bg-app-bg border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
              />
            </div>
          </div>

          {type === MediaType.BOOK && (
            <div className="space-y-2 flex-1">
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

        {/* Row 4: Notes/Comment */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">Notes / Comment</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a comment or reminder..."
            rows={2}
            className="w-full bg-app-bg border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-accent/50 transition-colors resize-none"
          />
        </div>

        {/* Row 5: Submit Button */}
        <button
          type="submit"
          disabled={!title}
          className="w-full bg-primary-accent text-app-bg py-4 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-accent/10 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          <span>Add to Backlog</span>
        </button>
      </form>
    </div>
  );
};
