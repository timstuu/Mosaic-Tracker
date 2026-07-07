import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Film, Tv, Book, Gamepad2, Star, Calendar, Monitor, Cpu } from 'lucide-react';
import { MediaType, MediaStatus, MediaItem } from '../types';
import { fetchMediaPoster, fetchSimilarRecommendations, TMDbRecommendation } from '../services/tmdbService';
import { fetchBookCover } from '../services/bookService';
import { fetchGameCover } from '../services/gameService';

interface EditModalProps {
  item: MediaItem;
  onClose: () => void;
  onSave: (item: Partial<MediaItem>) => void;
  onDelete: (id: string) => void;
  onAddToBacklog?: (item: { title: string; type: MediaType; imageUrl?: string }) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ item, onClose, onSave, onDelete, onAddToBacklog }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState<MediaType>(item.type);
  const [title, setTitle] = useState(item.title);
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
  const [isDnf, setIsDnf] = useState(item.status === MediaStatus.DNF);

  const [addedIds, setAddedIds] = useState<number[]>([]);

  // TV progress state variables
  const [currentSeason, setCurrentSeason] = useState(item.currentSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState(item.currentEpisode || 0);
  const [totalSeasons, setTotalSeasons] = useState(item.totalSeasons || 1);
  const [totalEpisodes, setTotalEpisodes] = useState(item.totalEpisodes || 0);

  const isVisualMedia = [MediaType.MOVIE, MediaType.DOCUMENTARY].includes(type);
  const isInteractiveMedia = [MediaType.BOOK, MediaType.GAME, MediaType.SHOW].includes(type);

  // Automatically calculate responsive status based on date fields
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

  const [recommendations, setRecommendations] = useState<TMDbRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (!title || !['movie', 'show', 'documentary'].includes(type)) {
      setRecommendations([]);
      return;
    }

    const loadRecommendations = async () => {
      setLoadingRecs(true);
      try {
        const recType = type === 'show' ? 'show' : 'movie';
        const fetched = await fetchSimilarRecommendations(title, recType);
        if (active) {
          setRecommendations(fetched);
        }
      } catch (err) {
        console.error('Error fetching similar recommendations:', err);
      } finally {
        if (active) {
          setLoadingRecs(false);
        }
      }
    };

    const timer = setTimeout(() => {
      loadRecommendations();
    }, 600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [title, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let currentImageUrl = item.imageUrl;
    
    // If title or ISBN changed, try to fetch a new cover
    if (title !== item.title || (type === MediaType.BOOK && isbn !== item.isbn)) {
      if ([MediaType.MOVIE, MediaType.SHOW, MediaType.DOCUMENTARY].includes(type)) {
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
      status: derivedStatus,
      rating,
      notes,
      tags,
      imageUrl: currentImageUrl,
      link: link || undefined,
      isbn: type === MediaType.BOOK ? isbn : undefined,
      watchDate: [MediaType.MOVIE, MediaType.DOCUMENTARY].includes(type) ? (watchDate || undefined) : undefined,
      startDate: [MediaType.BOOK, MediaType.GAME, MediaType.SHOW].includes(type) ? (startDate || undefined) : undefined,
      endDate: [MediaType.BOOK, MediaType.GAME, MediaType.SHOW].includes(type) ? (endDate || undefined) : undefined,
      platform: [MediaType.MOVIE, MediaType.SHOW, MediaType.DOCUMENTARY].includes(type) ? platform : undefined,
      console: type === MediaType.GAME ? consoleName : undefined,
      currentSeason: type === MediaType.SHOW ? currentSeason : undefined,
      currentEpisode: type === MediaType.SHOW ? currentEpisode : undefined,
      totalSeasons: type === MediaType.SHOW ? totalSeasons : undefined,
      totalEpisodes: type === MediaType.SHOW ? totalEpisodes : undefined,
    };
    onSave(updatedItem);
  };

  if (!isEditing) {
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
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-secondary-accent/50">
            <h2 className="text-xl font-semibold text-white">Media Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors" title="Close">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Visual Header Grid: Cover Image on Left, Details on Right */}
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Cover Art */}
              <div className="w-full sm:w-[150px] aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-zinc-900/50 flex items-center justify-center relative">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-gradient-to-br from-white/5 to-white/[0.02]">
                    {type === MediaType.MOVIE || type === MediaType.DOCUMENTARY ? <Film size={36} /> : 
                     type === MediaType.SHOW ? <Tv size={36} /> :
                     type === MediaType.BOOK ? <Book size={36} /> : <Gamepad2 size={36} />}
                  </div>
                )}
                {derivedStatus === MediaStatus.DNF && (
                  <div className="absolute top-2 right-2 bg-red-900/90 text-red-200 text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border border-red-500/20">
                    DNF
                  </div>
                )}
              </div>

              {/* Title and Key Details */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-bold text-white leading-tight font-sans">
                    {title}
                  </h1>
                  
                  {/* Category and Status Badge */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      {type}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                      derivedStatus === MediaStatus.COMPLETED 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : derivedStatus === MediaStatus.ACTIVE
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : derivedStatus === MediaStatus.DNF
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                    }`}>
                      {derivedStatus}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-[#576d87] uppercase tracking-widest">Rating</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        size={18} 
                        className={`${s <= rating ? 'fill-primary-accent text-primary-accent' : 'text-white/10'}`} 
                      />
                    ))}
                  </div>
                </div>

                {/* Custom Fields depending on type */}
                <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-white/[0.03]">
                  {platform && (
                    <div>
                      <span className="block text-[9px] font-bold text-[#576d87] uppercase tracking-widest">Platform</span>
                      <span className="text-zinc-200 font-medium">{platform}</span>
                    </div>
                  )}
                  {consoleName && (
                    <div>
                      <span className="block text-[9px] font-bold text-[#576d87] uppercase tracking-widest">Console</span>
                      <span className="text-zinc-200 font-medium">{consoleName}</span>
                    </div>
                  )}
                  {isbn && (
                    <div>
                      <span className="block text-[9px] font-bold text-[#576d87] uppercase tracking-widest">ISBN</span>
                      <span className="text-zinc-200 font-mono">{isbn}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[9px] font-bold text-[#576d87] uppercase tracking-widest">Added</span>
                    <span className="text-zinc-200 font-mono">
                      {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates Grid */}
            {(watchDate || startDate || endDate) && (
              <div className="bg-[#242d3a]/30 border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs">
                {watchDate && (
                  <div className="col-span-2">
                    <span className="block text-[9.5px] font-bold text-[#576d87] uppercase tracking-widest mb-0.5">Watched On</span>
                    <span className="text-zinc-200 font-mono">{new Date(watchDate).toLocaleDateString()}</span>
                  </div>
                )}
                {startDate && (
                  <div>
                    <span className="block text-[9.5px] font-bold text-[#576d87] uppercase tracking-widest mb-0.5">Started On</span>
                    <span className="text-zinc-200 font-mono">{new Date(startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {endDate && (
                  <div>
                    <span className="block text-[9.5px] font-bold text-[#576d87] uppercase tracking-widest mb-0.5">Ended On</span>
                    <span className="text-zinc-200 font-mono">{new Date(endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* TV Show Progress Tracker */}
            {type === MediaType.SHOW && (
              <div className="bg-[#242d3a]/50 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#576d87] uppercase tracking-widest">
                    Show Progress
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Season {currentSeason} / {totalSeasons || 1} • Episode {currentEpisode}
                    {totalEpisodes > 0 ? ` / ${totalEpisodes}` : ''}
                  </span>
                </div>
                
                {/* Visual Progress Bar */}
                {totalEpisodes > 0 && (
                  <div className="space-y-1">
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((currentEpisode / totalEpisodes) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#576d87] font-mono">
                      <span>{Math.round((currentEpisode / totalEpisodes) * 100)}% Complete</span>
                      <span>{totalSeasons} Seasons Total</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Personal Notes */}
            {notes && (
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-[#576d87] uppercase tracking-widest">Personal Notes</span>
                <blockquote className="bg-app-bg border-l-2 border-primary-accent/40 rounded-r-xl p-4 text-xs text-zinc-300 italic whitespace-pre-wrap leading-relaxed">
                  "{notes}"
                </blockquote>
              </div>
            )}

            {/* Tags */}
            {tags && (
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-[#576d87] uppercase tracking-widest">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.split(',').map((tag, i) => (
                    <span 
                      key={i} 
                      className="px-2.5 py-0.5 bg-[#576d87]/10 border border-[#576d87]/20 rounded-full text-[9px] font-bold text-[#576d87] uppercase tracking-widest"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Title Recommendations */}
            {['movie', 'show', 'documentary'].includes(type) && recommendations.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold text-[#576d87] uppercase tracking-widest">
                    Recommended Similar Titles
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 scroll-smooth">
                  {recommendations.map((rec) => {
                    const userTagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                    const isGenreMatch = userTagList.some(tag => 
                      rec.title.toLowerCase().includes(tag) || 
                      rec.overview?.toLowerCase().includes(tag)
                    );
                    const hasBeenAdded = addedIds.includes(rec.id);
                    return (
                      <div key={rec.id} className="w-[110px] flex-shrink-0 flex flex-col gap-1.5 snap-start group relative text-[11px]">
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 bg-zinc-900/50">
                          {rec.posterUrl ? (
                            <img 
                              src={rec.posterUrl} 
                              alt={rec.title} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-[#576d87] font-mono text-center">No Cover</div>
                          )}
                          {isGenreMatch && (
                            <div className="absolute top-1 right-1 bg-emerald-500/95 text-app-bg text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shadow">
                              Match
                            </div>
                          )}
                          {rec.rating && rec.rating > 0 && (
                            <div className="absolute bottom-1 left-1 bg-black/80 text-amber-400 text-[7px] font-mono px-1 py-0.5 rounded border border-white/5">
                              ★ {rec.rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-white/90 truncate" title={rec.title}>{rec.title}</h4>
                          {onAddToBacklog && (
                            <button
                              type="button"
                              disabled={hasBeenAdded}
                              onClick={async () => {
                                if (hasBeenAdded) return;
                                try {
                                  await onAddToBacklog({
                                    title: rec.title,
                                    type: type,
                                    imageUrl: rec.posterUrl
                                  });
                                  setAddedIds(prev => [...prev, rec.id]);
                                } catch (e) {
                                  console.error('Error adding to backlog:', e);
                                }
                              }}
                              className={`w-full py-1 rounded text-[8px] font-bold uppercase tracking-widest transition-all border ${
                                hasBeenAdded 
                                  ? 'bg-[#1b2531] text-emerald-400/80 border-emerald-500/20 cursor-default' 
                                  : 'bg-white/5 hover:bg-emerald-500/10 text-[#576d87] hover:text-emerald-400 border-white/5 hover:border-emerald-500/20'
                              }`}
                            >
                              {hasBeenAdded ? 'Added ✓' : '+ Backlog'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons for Detail View */}
          <div className="p-6 bg-secondary-accent/50 border-t border-white/5 flex flex-wrap gap-3">
            {/* Quick Actions depending on status */}

            {derivedStatus === MediaStatus.ACTIVE && (
              <>
                {type === MediaType.SHOW && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextEpisode = (currentEpisode ?? 0) + 1;
                      let newStatus: MediaStatus = derivedStatus;
                      let finishedDate = endDate;
                      if (totalEpisodes && nextEpisode >= totalEpisodes) {
                        newStatus = MediaStatus.COMPLETED;
                        finishedDate = new Date().toISOString().split('T')[0];
                      }
                      const updated: Partial<MediaItem> = {
                        ...item,
                        currentEpisode: nextEpisode,
                        status: newStatus,
                        endDate: finishedDate
                      };
                      onSave(updated);
                    }}
                    className="flex-1 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500 hover:text-app-bg text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    +1 Episode
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const updated: Partial<MediaItem> = {
                      ...item,
                      status: MediaStatus.COMPLETED,
                      endDate: new Date().toISOString().split('T')[0],
                      watchDate: [MediaType.MOVIE, MediaType.DOCUMENTARY].includes(type) ? new Date().toISOString().split('T')[0] : undefined
                    };
                    onSave(updated);
                  }}
                  className="flex-1 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500 hover:text-app-bg text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Mark Completed
                </button>
              </>
            )}

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex-1 px-4 py-3 bg-primary-accent text-app-bg rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary-accent/10"
            >
              Edit Details
            </button>

            {/* Open Link */}
            {(() => {
              const defaultSearchLink = (type === MediaType.MOVIE || type === MediaType.SHOW || type === MediaType.DOCUMENTARY) 
                ? 'https://www.werstreamt.es/filme-serien/?q=' + encodeURIComponent(title) 
                : `https://www.google.com/search?q=${encodeURIComponent(title)}`;
              const linkUrl = link || defaultSearchLink;
              return (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-app-bg text-zinc-300 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                >
                  Open Link
                </a>
              );
            })()}

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this entry?')) {
                  onDelete(item.id);
                }
              }}
              className="px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest"
            >
              Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

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
            {item.status === MediaStatus.PLANNED && derivedStatus === MediaStatus.COMPLETED ? 'Complete Tracking' : 'Edit Media'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors" title="Close">
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
                { id: MediaType.SHOW, icon: <Tv size={18} />, label: 'Show' },
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {type !== MediaType.SHOW && (
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
                          <Calendar size={12} /> Watch Date
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={watchDate}
                            onChange={(e) => setWatchDate(e.target.value)}
                            className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                          />
                          {watchDate && (
                            <button
                              type="button"
                              onClick={() => setWatchDate('')}
                              className="p-3 text-zinc-500 hover:text-white bg-app-bg border border-white/10 rounded-xl transition-colors shrink-0"
                              title="Clear date"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className={type === MediaType.SHOW ? "col-span-2" : ""}>
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
                          <Calendar size={12} /> Start Date
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                          />
                          {startDate && (
                            <button
                              type="button"
                              onClick={() => setStartDate('')}
                              className="p-3 text-zinc-500 hover:text-white bg-app-bg border border-white/10 rounded-xl transition-colors shrink-0"
                              title="Clear date"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-2">
                          <Calendar size={12} /> End Date
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                          />
                          {endDate && (
                            <button
                              type="button"
                              onClick={() => setEndDate('')}
                              className="p-3 text-zinc-500 hover:text-white bg-app-bg border border-white/10 rounded-xl transition-colors shrink-0"
                              title="Clear date"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
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

                    {type === MediaType.SHOW && (
                      <div className="pt-4 pb-3 px-4 bg-app-bg/50 border border-white/5 rounded-xl space-y-3">
                        <label className="block text-[10px] font-bold text-white uppercase tracking-widest">
                          Show Progress
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Season inputs */}
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-bold text-[#576d87] uppercase tracking-widest">
                              Season Progress
                            </label>
                            <div className="flex items-center gap-1 bg-app-bg border border-white/10 rounded-lg px-2 py-1">
                              <input
                                type="number"
                                min={1}
                                value={currentSeason}
                                onChange={(e) => setCurrentSeason(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-transparent text-center focus:outline-none text-white font-mono text-xs"
                                placeholder="Current"
                                title="Current Season"
                              />
                              <span className="text-zinc-600 text-xs">/</span>
                              <input
                                type="number"
                                min={1}
                                value={totalSeasons}
                                onChange={(e) => setTotalSeasons(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-transparent text-center focus:outline-none text-white font-mono text-xs"
                                placeholder="Total"
                                title="Total Seasons"
                              />
                            </div>
                          </div>
                          
                          {/* Episode inputs */}
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-bold text-[#576d87] uppercase tracking-widest">
                              Episode Progress
                            </label>
                            <div className="flex items-center gap-1 bg-app-bg border border-white/10 rounded-lg px-2 py-1">
                              <input
                                type="number"
                                min={0}
                                value={currentEpisode}
                                onChange={(e) => setCurrentEpisode(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-transparent text-center focus:outline-none text-white font-mono text-xs"
                                placeholder="Current"
                                title="Current Episode"
                              />
                              <span className="text-zinc-600 text-xs">/</span>
                              <input
                                type="number"
                                min={0}
                                value={totalEpisodes}
                                onChange={(e) => setTotalEpisodes(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-transparent text-center focus:outline-none text-white font-mono text-xs"
                                placeholder="Total"
                                title="Total Episodes"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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

            {/* TMDB Recommendations shelf */}
            {['movie', 'show', 'documentary'].includes(type) && (
              <div className="space-y-3 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-white uppercase tracking-widest">
                      Recommended Similar Titles
                    </label>
                    <p className="text-[9.5px] text-[#576d87] font-semibold mt-0.5">
                      Based on current genre tags and title
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#576d87]/80 uppercase font-semibold">
                    TMDB API
                  </span>
                </div>

                {loadingRecs ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-app-bg/30 border border-white/5 rounded-2xl text-zinc-500 gap-2">
                    <div className="w-5 h-5 border-2 border-primary-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#576d87]">Querying Similar Titles...</span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 scroll-smooth">
                    {recommendations.map((rec) => {
                      const userTagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                      const isGenreMatch = userTagList.some(tag => 
                        rec.title.toLowerCase().includes(tag) || 
                        rec.overview?.toLowerCase().includes(tag)
                      );

                      return (
                        <div 
                          key={rec.id}
                          className="w-[125px] flex-shrink-0 flex flex-col gap-1.5 snap-start group relative"
                        >
                          <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 bg-zinc-900/50">
                            {rec.posterUrl ? (
                              <img 
                                src={rec.posterUrl} 
                                alt={rec.title} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-[#576d87] font-mono text-center px-1">
                                No Cover
                              </div>
                            )}

                            {isGenreMatch && (
                              <div className="absolute top-1 right-1 bg-emerald-500/95 text-app-bg text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shadow">
                                Match
                              </div>
                            )}

                            {rec.rating && rec.rating > 0 && (
                              <div className="absolute bottom-1 left-1 bg-black/80 text-amber-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/5">
                                ★ {rec.rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <h4 
                              className="text-[11px] font-semibold text-white/90 truncate group-hover:text-primary-accent transition-colors" 
                              title={rec.title}
                            >
                              {rec.title}
                            </h4>
                            {rec.releaseDate && (
                              <p className="text-[9.5px] text-[#576d87] font-mono">
                                {rec.releaseDate.split('-')[0]}
                              </p>
                            )}
                            {(() => {
                              const hasBeenAdded = addedIds.includes(rec.id);
                              return (
                                <button
                                  type="button"
                                  disabled={hasBeenAdded}
                                  onClick={async () => {
                                    if (hasBeenAdded) return;
                                    try {
                                      if (onAddToBacklog) {
                                        await onAddToBacklog({
                                          title: rec.title,
                                          type: type,
                                          imageUrl: rec.posterUrl
                                        });
                                        setAddedIds(prev => [...prev, rec.id]);
                                      } else {
                                        console.warn('onAddToBacklog prop is missing');
                                      }
                                    } catch (e) {
                                      console.error('Error adding to backlog:', e);
                                    }
                                  }}
                                  className={`w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all text-center border ${
                                    hasBeenAdded 
                                      ? 'bg-[#1b2531] text-emerald-400/80 border-emerald-500/20 cursor-default' 
                                      : 'bg-white/5 hover:bg-emerald-500/10 text-[#576d87] hover:text-emerald-400 border-white/5 hover:border-emerald-500/20'
                                  }`}
                                >
                                  {hasBeenAdded ? 'Added ✓' : '+ Backlog'}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#242d3a]/60 border border-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[#576d87] text-xs italic font-sans font-medium">
                      No similar titles could be matched for "{title}".
                    </p>
                  </div>
                )}
              </div>
            )}
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
                onClick={() => setIsEditing(false)}
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
