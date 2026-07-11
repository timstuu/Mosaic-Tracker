import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Film, Tv, Book, Gamepad2, Star, Calendar, Monitor, Cpu, Scan } from 'lucide-react';
import { MediaType, MediaItem, MediaStatus } from '../types';
import { searchTVShows, fetchTVShowDetails, searchMovies } from '../services/tmdbService';
import { searchBooks } from '../services/bookService';
import { searchGames } from '../services/gameService';
import { BarcodeScanner } from './BarcodeScanner';

interface MediaFormProps {
  onClose: () => void;
  onSave: (item: Partial<MediaItem>) => void;
}

interface UnifiedSuggestion {
  id: string | number;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  rawData: any;
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

  // New states for TV show tracking
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [totalSeasons, setTotalSeasons] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [imageUrl, setImageUrl] = useState('');

  // Suggestions state
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Barcode and Open Library lookup states
  const [isbn, setIsbn] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isResolvingIsbn, setIsResolvingIsbn] = useState(false);

  const handleBarcodeScanned = async (scannedIsbn: string) => {
    setShowScanner(false);
    setIsbn(scannedIsbn);
    setIsResolvingIsbn(true);

    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${scannedIsbn}&jscmd=data&format=json`);
      if (res.ok) {
        const data = await res.json();
        const key = `ISBN:${scannedIsbn}`;
        const bookInfo = data[key];
        if (bookInfo) {
          if (bookInfo.title) {
            setTitle(bookInfo.title);
          }
          if (bookInfo.cover?.large || bookInfo.cover?.medium || bookInfo.cover?.small) {
            const coverUrl = bookInfo.cover.large || bookInfo.cover.medium || bookInfo.cover.small;
            setImageUrl(coverUrl);
          }
        }
      }
    } catch (err) {
      console.error('Failed to query Open Library API metadata:', err);
    } finally {
      setIsResolvingIsbn(false);
    }
  };

  const isVisualMedia = [MediaType.MOVIE, MediaType.DOCUMENTARY].includes(type);
  const isInteractiveMedia = [MediaType.BOOK, MediaType.GAME, MediaType.SHOW].includes(type);


  const handleSelectSuggestion = async (suggestion: UnifiedSuggestion) => {
    setTitle(suggestion.title);
    setSuggestions([]);

    if (suggestion.imageUrl) {
      if (type === MediaType.SHOW || type === MediaType.MOVIE || type === MediaType.DOCUMENTARY) {
        const highResUrl = suggestion.imageUrl.replace('/w92', '/w500');
        setImageUrl(highResUrl);
      } else if (type === MediaType.BOOK) {
        const highResUrl = suggestion.imageUrl.replace('-S.jpg', '-M.jpg');
        setImageUrl(highResUrl);
      } else {
        setImageUrl(suggestion.imageUrl);
      }
    } else {
      setImageUrl('');
    }

    if (type === MediaType.SHOW) {
      setSearching(true);
      try {
        const details = await fetchTVShowDetails(suggestion.rawData.id);
        if (details) {
          setTotalSeasons(details.totalSeasons);
          setTotalEpisodes(details.totalEpisodes);
          if (details.imageUrl) {
            setImageUrl(details.imageUrl);
          }
        }
      } catch (e) {
        console.error('Error fetching TV show details:', e);
      } finally {
        setSearching(false);
      }
    } else if (type === MediaType.BOOK) {
      if (suggestion.rawData.isbn && suggestion.rawData.isbn.length > 0) {
        setIsbn(suggestion.rawData.isbn[0]);
      } else {
        setIsbn('');
      }
    }
  };

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
      currentSeason: type === MediaType.SHOW ? currentSeason : undefined,
      currentEpisode: type === MediaType.SHOW ? currentEpisode : undefined,
      totalSeasons: type === MediaType.SHOW ? totalSeasons : undefined,
      totalEpisodes: type === MediaType.SHOW ? totalEpisodes : undefined,
      imageUrl: imageUrl || undefined,
      isbn: type === MediaType.BOOK ? isbn : undefined,
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
                onClick={() => {
                  setType(item.id);
                  setSuggestions([]);
                }}
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
            <div className="relative">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Title</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val);
                  if (val.trim().length >= 2) {
                    setSearching(true);
                    if (type === MediaType.MOVIE || type === MediaType.DOCUMENTARY) {
                      searchMovies(val).then((res) => {
                        const mapped: UnifiedSuggestion[] = res.map(m => ({
                          id: `movie-${m.id}`,
                          title: m.title,
                          subtitle: m.release_date ? new Date(m.release_date).getFullYear().toString() : undefined,
                          imageUrl: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : null,
                          rawData: m
                        }));
                        setSuggestions(mapped.slice(0, 5));
                        setSearching(false);
                      }).catch(() => {
                        setSearching(false);
                      });
                    } else if (type === MediaType.SHOW) {
                      searchTVShows(val).then((res) => {
                        const mapped: UnifiedSuggestion[] = res.map(s => ({
                          id: `show-${s.id}`,
                          title: s.name,
                          subtitle: s.first_air_date ? new Date(s.first_air_date).getFullYear().toString() : undefined,
                          imageUrl: s.poster_path ? `https://image.tmdb.org/t/p/w92${s.poster_path}` : null,
                          rawData: s
                        }));
                        setSuggestions(mapped.slice(0, 5));
                        setSearching(false);
                      }).catch(() => {
                        setSearching(false);
                      });
                    } else if (type === MediaType.BOOK) {
                      searchBooks(val).then((res) => {
                        const mapped: UnifiedSuggestion[] = res.map(b => {
                          const author = b.author_name && b.author_name.length > 0 ? b.author_name[0] : undefined;
                          const subtitle = author 
                            ? (b.first_publish_year ? `${author} (${b.first_publish_year})` : author)
                            : (b.first_publish_year ? b.first_publish_year.toString() : undefined);
                          const coverUrl = b.cover_i 
                            ? `https://covers.openlibrary.org/b/id/${b.cover_i}-S.jpg` 
                            : (b.isbn && b.isbn.length > 0 ? `https://covers.openlibrary.org/b/isbn/${b.isbn[0]}-S.jpg` : null);
                          return {
                            id: `book-${b.isbn?.[0] || b.cover_i || Math.random()}`,
                            title: b.title,
                            subtitle,
                            imageUrl: coverUrl,
                            rawData: b
                          };
                        });
                        setSuggestions(mapped.slice(0, 5));
                        setSearching(false);
                      }).catch(() => {
                        setSearching(false);
                      });
                    } else if (type === MediaType.GAME) {
                      searchGames(val).then((res) => {
                        const mapped: UnifiedSuggestion[] = res.map(g => ({
                          id: `game-${g.id}`,
                          title: g.name,
                          subtitle: g.released ? new Date(g.released).getFullYear().toString() : undefined,
                          imageUrl: g.background_image,
                          rawData: g
                        }));
                        setSuggestions(mapped.slice(0, 5));
                        setSearching(false);
                      }).catch(() => {
                        setSearching(false);
                      });
                    } else {
                      setSuggestions([]);
                      setSearching(false);
                    }
                  } else {
                    setSuggestions([]);
                  }
                }}
                placeholder="Enter title..."
                className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors"
                autoComplete="off"
              />

              {(suggestions.length > 0 || searching) && (
                <div className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-55 max-h-60 overflow-y-auto">
                  {searching && suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#576d87] animate-pulse">Searching suggestions...</div>
                  ) : (
                    suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors text-xs text-white"
                      >
                        {suggestion.imageUrl ? (
                          <img 
                            src={suggestion.imageUrl} 
                            alt={suggestion.title} 
                            referrerPolicy="no-referrer"
                            className="w-6 h-9 object-cover rounded shadow"
                          />
                        ) : (
                          <div className="w-6 h-9 bg-white/5 rounded flex items-center justify-center text-zinc-500 shrink-0">
                            {type === MediaType.BOOK ? <Book size={12} /> : type === MediaType.GAME ? <Gamepad2 size={12} /> : <Film size={12} />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold block truncate text-sm">{suggestion.title}</span>
                          {suggestion.subtitle && (
                            <span className="text-[10px] text-[#576d87] block mt-0.5 truncate">
                              {suggestion.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Book Media Type Extra Fields: ISBN and Scan Barcode Layout Button */}
            {type === MediaType.BOOK && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">ISBN</label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="Enter ISBN (e.g. 9780140328721)..."
                    className="w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors font-mono"
                    autoComplete="off"
                  />
                </div>
                
                {isResolvingIsbn && (
                  <div className="text-xs text-[#576d87] animate-pulse flex items-center gap-2 px-1">
                    <div className="w-2.5 h-2.5 border-2 border-primary-accent border-t-transparent rounded-full animate-spin" />
                    <span>Resolving book details from Open Library...</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 px-4 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 text-[#576d87] hover:text-[#e7e7e7] border-0"
                >
                  <Scan size={16} />
                  <span>Add via Barcode</span>
                </button>
              </div>
            )}



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

                    {type === MediaType.SHOW && startDate && !endDate && (
                      <div className="pt-3 pb-2 px-4 bg-app-bg/50 border border-white/5 rounded-xl space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          Show Progress (Watching)
                        </label>
                        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                          <span className="text-[11px] text-[#576d87] font-semibold uppercase tracking-wider">Season</span>
                          <input
                            type="number"
                            min={1}
                            max={totalSeasons || 50}
                            value={currentSeason}
                            onChange={(e) => setCurrentSeason(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-10 bg-transparent text-center border-b border-transparent hover:border-white/20 focus:border-primary-accent focus:outline-none text-white font-mono text-xs py-0.5"
                          />
                          <span className="text-[#576d87]/30 text-xs">/</span>
                          <span className="text-zinc-400 font-mono text-xs w-4">{totalSeasons || 1}</span>
                          
                          <span className="text-[11px] text-[#576d87] font-semibold uppercase tracking-wider ml-3">Episode</span>
                          <input
                            type="number"
                            min={0}
                            max={totalEpisodes || 1000}
                            value={currentEpisode}
                            onChange={(e) => setCurrentEpisode(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-12 bg-transparent text-center border-b border-transparent hover:border-white/20 focus:border-primary-accent focus:outline-none text-white font-mono text-xs py-0.5"
                          />
                          <span className="text-[#576d87]/30 text-xs">/</span>
                          <span className="text-zinc-400 font-mono text-xs">{totalEpisodes || 'N/A'} Episodes</span>
                        </div>
                      </div>
                    )}
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

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </motion.div>
  );
};
