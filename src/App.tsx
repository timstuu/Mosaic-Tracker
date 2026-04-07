/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { QuickAdd } from './components/QuickAdd';
import { ActiveMediaShelf } from './components/ActiveMediaShelf';
import { MosaicLaunch } from './components/MosaicLaunch';
import { Analytics } from './components/Analytics';
import { BacklogAdd } from './components/BacklogAdd';
import { ImportModal } from './components/ImportModal';
import { EditModal } from './components/EditModal';
import { MediaItem, MediaType, Challenge, MediaStatus } from './types';
import { Star, Search, X, LayoutGrid, BarChart3, Settings as SettingsIcon, Trash2, Database, Shield, Bookmark, ExternalLink, Film, Tv, Book, Gamepad2, Plus, Edit2, Trophy, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChallengeModal } from './components/ChallengeModal';

import { MosaicView } from './components/MosaicView';

type Page = 'tracker' | 'backlog' | 'analytics' | 'settings';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activePage, setActivePage] = useState<Page>('tracker');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLaunch, setShowLaunch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'library' | 'watchlist'>('library');
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'mosaic'>('mosaic');
  const [expandedBacklogTypes, setExpandedBacklogTypes] = useState<Set<MediaType>>(new Set());

  useEffect(() => {
    setIsSearchVisible(false);
    setSearchQuery('');
  }, [activePage]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        setSession(session);
        if (session) {
          fetchMedia();
          fetchChallenges();
        } else {
          setLoading(false);
        }
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        setSession(session);
        if (session) {
          fetchMedia();
          fetchChallenges();
        } else {
          setMediaItems([]);
          setChallenges([]);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMedia = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('media_items')
        .select('*');
      
      if (error) throw error;
      
      const normalizedData = (data || []).map(item => {
        let status = item.status?.toLowerCase().trim();
        if (!status) {
          if (item.watchDate || item.endDate) {
            status = MediaStatus.COMPLETED;
          } else if (item.startDate && !item.endDate) {
            status = MediaStatus.ACTIVE;
          } else {
            status = MediaStatus.PLANNED;
          }
        } else if (status === MediaStatus.PLANNED && (item.watchDate || item.endDate)) {
          status = MediaStatus.COMPLETED;
        } else if (item.startDate && !item.endDate && status !== MediaStatus.COMPLETED) {
          status = MediaStatus.ACTIVE;
        }
        return { ...item, status };
      });
      
      setMediaItems(normalizedData);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallenges = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*');
      
      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    }
  };

  const handleSaveChallenge = async (challenge: Partial<Challenge>) => {
    if (!isSupabaseConfigured) {
      alert('Please configure Supabase in your environment variables first.');
      return;
    }
    try {
      const { error } = await supabase
        .from('challenges')
        .upsert(challenge);
      
      if (error) throw error;
      fetchChallenges();
    } catch (error) {
      console.error('Failed to save challenge:', error);
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchChallenges();
    } catch (error) {
      console.error('Failed to delete challenge:', error);
    }
  };

  const handleClearData = async (status: MediaStatus) => {
    if (!isSupabaseConfigured) return;
    
    const label = status === MediaStatus.COMPLETED ? 'Tracker History' : 'Backlog';
    const itemsToDelete = mediaItems.filter(item => item.status === status);
    
    if (itemsToDelete.length === 0) {
      alert(`No items found in your ${label} to clear.`);
      return;
    }

    if (!confirm(`Are you sure you want to clear your entire ${label} (${itemsToDelete.length} items)? This cannot be undone.`)) {
      return;
    }

    try {
      const idsToDelete = itemsToDelete.map(item => item.id);
      console.log(`Attempting to clear ${label} with ${idsToDelete.length} items:`, idsToDelete);

      const { error } = await supabase
        .from('media_items')
        .delete()
        .in('id', idsToDelete);
      
      if (error) throw error;
      
      console.log(`Successfully cleared ${label}`);
      await fetchMedia();
      alert(`Successfully cleared ${label}.`);
    } catch (error) {
      console.error(`Failed to clear ${label}:`, error);
      alert(`Failed to clear ${label}. Please check the console for details.`);
    }
  };

  const handleSaveMedia = async (item: Partial<MediaItem>) => {
    if (!isSupabaseConfigured) {
      alert('Please configure Supabase in your environment variables first.');
      return;
    }
    try {
      const { error } = await supabase
        .from('media_items')
        .insert(item);
      
      if (error) throw error;
      setShowLaunch(true);
      fetchMedia();
    } catch (error) {
      console.error('Failed to save media:', error);
    }
  };

  const handleUpdateMedia = async (item: Partial<MediaItem>) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('media_items')
        .update(item)
        .eq('id', item.id);
      
      if (error) throw error;
      setEditingItem(null);
      fetchMedia();
    } catch (error) {
      console.error('Failed to update media:', error);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!isSupabaseConfigured) return;
    console.log('Attempting to delete media with id:', id);
    try {
      const { error } = await supabase
        .from('media_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      console.log('Successfully deleted media');
      setEditingItem(null);
      fetchMedia();
    } catch (error) {
      console.error('Error during delete media request:', error);
      alert('An error occurred while trying to delete the item.');
    }
  };

  const handleMoveToTracker = (item: MediaItem) => {
    setEditingItem({
      ...item,
      status: MediaStatus.COMPLETED,
      watchDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startDate: item.startDate || new Date().toISOString().split('T')[0],
    });
  };

  const handleImport = async (items: Partial<MediaItem>[]) => {
    if (!isSupabaseConfigured) {
      alert('Please configure Supabase in your environment variables first.');
      return;
    }
    try {
      const { error } = await supabase
        .from('media_items')
        .insert(items);
      
      if (error) throw error;
      fetchMedia();
      alert(`Successfully imported ${items.length} items!`);
    } catch (error) {
      console.error('Error importing library:', error);
      alert('Failed to import items. Please check the console for details.');
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...mediaItems].sort((a, b) => {
        const dateA = new Date(a.watchDate || a.endDate || a.dateAdded).getTime();
        const dateB = new Date(b.watchDate || b.endDate || b.dateAdded).getTime();
        return dateB - dateA;
      });
    }

    const query = searchQuery.toLowerCase();
    return [...mediaItems]
      .filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const tagMatch = item.tags?.toLowerCase().includes(query);
        const platformMatch = item.platform?.toLowerCase().includes(query);
        const consoleMatch = item.console?.toLowerCase().includes(query);
        const notesMatch = item.notes?.toLowerCase().includes(query);
        return titleMatch || tagMatch || platformMatch || consoleMatch || notesMatch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.watchDate || a.endDate || a.dateAdded).getTime();
        const dateB = new Date(b.watchDate || b.endDate || b.dateAdded).getTime();
        return dateB - dateA;
      });
  }, [mediaItems, searchQuery]);

  const renderList = (items: MediaItem[]) => {
    let lastMonthYear = "";

    return (
      <div className="space-y-1">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-[140px_60px_48px_1fr_120px] px-6 py-3 text-[10px] font-bold text-white uppercase tracking-widest border-b border-white/5">
          <div>Period</div>
          <div>Day</div>
          <div></div>
          <div>Title</div>
          <div className="text-right">Rating</div>
        </div>

        {items.map((item, index) => {
          const date = new Date(item.watchDate || item.endDate || item.dateAdded);
          const currentMonthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          
          const isFirstInMonth = currentMonthYear !== lastMonthYear;
          lastMonthYear = currentMonthYear;

          return (
            <React.Fragment key={item.id}>
              {/* Mobile Month Divider */}
              {isFirstInMonth && (
                <div className="md:hidden px-4 py-2 bg-white/5 border-y border-white/[0.05] text-[10px] font-bold text-primary-accent uppercase tracking-widest">
                  {currentMonthYear}
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex md:grid md:grid-cols-[140px_60px_48px_1fr_120px] md:items-center px-4 md:px-6 py-4 hover:bg-white/5 transition-colors group border-b border-white/[0.02] gap-4 md:gap-0"
              >
                {/* Desktop Period Column */}
                <div className="hidden md:block text-sm font-serif italic text-primary-accent">
                  {isFirstInMonth ? currentMonthYear : ""}
                </div>
                
                {/* Day Column */}
                <div className="text-sm font-mono text-white w-8 md:w-auto shrink-0">
                  {date.getDate().toString().padStart(2, '0')}
                </div>

                {/* Cover Art Thumbnail */}
                <div className="flex items-center justify-center shrink-0">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      referrerPolicy="no-referrer"
                      className="w-8 h-12 md:w-8 md:h-12 object-cover rounded shadow-lg shadow-black/40 border border-white/10"
                    />
                  ) : (
                    <div className="w-8 h-12 bg-white/5 rounded border border-white/5 flex items-center justify-center text-zinc-300">
                      {item.type === MediaType.MOVIE || item.type === MediaType.DOCUMENTARY ? <Film size={14} /> : 
                       item.type === MediaType.SERIES ? <Tv size={14} /> :
                       item.type === MediaType.BOOK ? <Book size={14} /> : <Gamepad2 size={14} />}
                    </div>
                  )}
                </div>
                
                {/* Title & Rating Container */}
                <div className="flex-1 md:contents">
                  <div className="flex flex-col md:flex-row md:items-start md:py-1 gap-1 md:gap-4">
                    <div className="text-sm font-medium text-white group-hover:text-primary-accent transition-colors whitespace-normal break-words">
                      {item.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(item.startDate && item.endDate) && (
                        <div className="text-[10px] text-white font-mono whitespace-nowrap">
                          {new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}
                        </div>
                      )}
                      {(item.platform || item.console) && (
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {item.platform || item.console}
                        </span>
                      )}
                      {item.tags && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.split(',').map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-primary-accent/10 border border-primary-accent/20 rounded text-[8px] font-bold text-primary-accent uppercase tracking-widest">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex md:justify-end items-center gap-2 mt-1 md:mt-0">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={10}
                          className={`${i < item.rating ? 'fill-primary-accent text-primary-accent' : 'text-zinc-700'}`} 
                        />
                      ))}
                    </div>
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-zinc-400 hover:text-primary-accent transition-colors"
                      title="Edit entry"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderSearchResults = () => {
    return (
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-serif italic text-white mb-2">Search Results</h1>
          <p className="text-zinc-300 text-sm">Found {filteredAndSortedItems.length} items matching "{searchQuery}"</p>
        </div>

        <div className="flex justify-end mb-4">
          <div className="bg-secondary-accent/50 p-1 rounded-xl border border-white/5 flex gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'bg-primary-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('mosaic')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${viewMode === 'mosaic' ? 'bg-primary-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Mosaic
            </button>
          </div>
        </div>

        <div className="bg-secondary-accent/30 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-sm mb-24">
          {filteredAndSortedItems.length === 0 ? (
            <div className="p-24 text-center">
              <p className="text-zinc-300">No entries found for "{searchQuery}".</p>
            </div>
          ) : viewMode === 'mosaic' ? (
            <MosaicView 
              items={filteredAndSortedItems} 
              onItemClick={setEditingItem} 
            />
          ) : (
            renderList(filteredAndSortedItems)
          )}
        </div>
      </div>
    );
  };

  const renderTracker = () => {
    const activeItems = filteredAndSortedItems.filter(
      i => i.status === MediaStatus.ACTIVE
    );
    
    const completedItems = filteredAndSortedItems.filter(
      i => i.status === MediaStatus.COMPLETED
    );

    return (
      <div className="max-w-4xl mx-auto">
        <QuickAdd onSave={handleSaveMedia} />

        <ActiveMediaShelf 
          items={activeItems} 
          onItemClick={setEditingItem} 
        />

        <div className="flex justify-end mb-4 mt-8">
          <div className="bg-secondary-accent/50 p-1 rounded-xl border border-white/5 flex gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'bg-primary-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('mosaic')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${viewMode === 'mosaic' ? 'bg-primary-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Mosaic
            </button>
          </div>
        </div>

        <div className="bg-secondary-accent/30 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-sm mb-24">
          {loading ? (
            <div className="p-12 text-center text-zinc-300 animate-pulse">Loading your library...</div>
          ) : completedItems.length === 0 ? (
            <div className="p-24 text-center">
              <p className="text-zinc-300">No completed entries found.</p>
            </div>
          ) : viewMode === 'mosaic' ? (
            <MosaicView 
              items={completedItems} 
              onItemClick={setEditingItem} 
            />
          ) : (
            renderList(completedItems)
          )}
        </div>
      </div>
    );
  };

  const renderBacklog = () => {
    const backlogItems = mediaItems
      .filter(item => item.status === MediaStatus.PLANNED)
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

    const groupedBacklog = Object.values(MediaType).reduce((acc, type) => {
      const items = backlogItems.filter(item => item.type === type);
      if (items.length > 0) acc[type] = items;
      return acc;
    }, {} as Record<MediaType, MediaItem[]>);

    const typeIcons = {
      [MediaType.MOVIE]: <Film size={14} />,
      [MediaType.SERIES]: <Tv size={14} />,
      [MediaType.DOCUMENTARY]: <Film size={14} />,
      [MediaType.BOOK]: <Book size={14} />,
      [MediaType.GAME]: <Gamepad2 size={14} />,
    };

    const toggleExpand = (type: MediaType) => {
      const next = new Set(expandedBacklogTypes);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      setExpandedBacklogTypes(next);
    };

    return (
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-serif italic text-white mb-2">Backlog</h1>
          <p className="text-zinc-300 text-sm">Media you're planning to experience later.</p>
        </div>

        <BacklogAdd onSave={handleSaveMedia} />

        <div className="space-y-8">
          {Object.entries(groupedBacklog).map(([type, items]) => {
            const mediaType = type as MediaType;
            const isExpanded = expandedBacklogTypes.has(mediaType);
            const displayedItems = isExpanded ? items : items.slice(0, 10);
            const hasMore = items.length > 10;

            return (
              <div key={type} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="text-primary-accent/60">{typeIcons[mediaType]}</div>
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {type}s
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-700 ml-1">({items.length})</span>
                  </div>
                </div>
                
                <div className="bg-secondary-accent/30 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-sm">
                  {displayedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.02] last:border-0 group hover:bg-white/5 transition-colors">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 object-cover rounded shadow-lg border border-white/10"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-white/5 rounded border border-white/5 flex items-center justify-center text-zinc-300">
                            {typeIcons[item.type]}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white group-hover:text-primary-accent transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {(item.platform || item.console) && (
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                              {item.platform || item.console}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600 font-mono">
                            Added {new Date(item.dateAdded).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingItem(item)}
                          className="p-2 text-zinc-300 hover:text-primary-accent transition-colors"
                          title="Edit entry"
                        >
                          <Edit2 size={16} />
                        </button>
                        <a 
                          href={item.link || `https://www.google.com/search?q=${encodeURIComponent([item.title, item.console, item.platform, item.isbn].filter(Boolean).join(', '))}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-zinc-300 hover:text-primary-accent transition-colors"
                          title={item.link ? "Open Link" : "Search Google"}
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button 
                          onClick={() => handleMoveToTracker(item)}
                          className="p-2 text-zinc-300 hover:text-emerald-500 transition-colors"
                          title="Mark as Tracked"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {hasMore && (
                    <button
                      onClick={() => toggleExpand(mediaType)}
                      className="w-full py-4 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 hover:text-primary-accent transition-all border-t border-white/[0.02]"
                    >
                      {isExpanded ? 'Show Less' : `Show More (${items.length - 10} more)`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {backlogItems.length === 0 && (
            <div className="py-20 text-center bg-secondary-accent/30 rounded-3xl border border-white/5 border-dashed">
              <Bookmark className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-white font-serif italic">Your backlog is empty. Add something above!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="max-w-4xl mx-auto px-4">
      <Analytics 
        items={mediaItems} 
        challenges={challenges}
        onAddChallenge={() => setIsChallengeModalOpen(true)}
        onDeleteChallenge={handleDeleteChallenge}
        onItemClick={setEditingItem}
      />
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      <div className="mb-12">
        <h1 className="text-3xl font-serif italic text-white mb-2">Settings</h1>
        <p className="text-white text-sm">Manage your library and preferences.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-primary-accent/10 rounded-xl flex items-center justify-center text-primary-accent">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Data Management</h3>
              <p className="text-xs text-white">Export or clear your library data.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group">
              <span className="text-sm text-white group-hover:text-white">Export Library (JSON)</span>
              <div className="text-white">→</div>
            </button>
            <button 
              onClick={() => {
                setImportMode('library');
                setIsImportModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
            >
              <span className="text-sm text-white group-hover:text-white">Import Library (CSV)</span>
              <div className="text-white">→</div>
            </button>
            <button 
              onClick={() => {
                setImportMode('watchlist');
                setIsImportModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm text-white group-hover:text-white">Import Letterboxd Watchlist</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Added to Backlog</span>
              </div>
              <div className="text-white">→</div>
            </button>
            <button 
              onClick={() => handleClearData(MediaStatus.COMPLETED)}
              className="w-full flex items-center justify-between p-4 bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm text-red-400 group-hover:text-red-300">Clear Tracker History</span>
                <span className="text-[10px] text-red-400/60">Delete all completed items</span>
              </div>
              <Trash2 size={16} className="text-red-500/50" />
            </button>
            <button 
              onClick={() => handleClearData(MediaStatus.PLANNED)}
              className="w-full flex items-center justify-between p-4 bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm text-red-400 group-hover:text-red-300">Clear Backlog</span>
                <span className="text-[10px] text-red-400/60">Delete all planned items</span>
              </div>
              <Trash2 size={16} className="text-red-500/50" />
            </button>
          </div>
        </div>

        <div className="bg-secondary-accent border border-white/5 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-primary-accent/10 rounded-xl flex items-center justify-center text-primary-accent">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Privacy & Security</h3>
              <p className="text-xs text-white">Control your tracking preferences.</p>
            </div>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl">
            <p className="text-xs text-white italic">Your data is stored locally in your private database. No tracking or external analytics are used.</p>
          </div>
        </div>

        <div className="pt-6">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all text-red-400 font-bold uppercase tracking-widest text-[10px]"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 max-w-md flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-1">Configuration Required</h3>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Supabase credentials are missing. Please set <code className="bg-black/20 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-black/20 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in the AI Studio settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-primary-accent" size={32} />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <Layout onSearchToggle={() => setIsSearchVisible(!isSearchVisible)}>
      <div className="max-w-4xl mx-auto px-4">
        <AnimatePresence>
          {isSearchVisible && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your media library..."
                  className="w-full bg-secondary-accent border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-primary-accent/50 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {searchQuery.trim() ? renderSearchResults() : (
        <>
          {activePage === 'tracker' && renderTracker()}
          {activePage === 'backlog' && renderBacklog()}
          {activePage === 'analytics' && renderAnalytics()}
          {activePage === 'settings' && renderSettings()}
        </>
      )}

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImport} 
        mode={importMode}
      />

      <AnimatePresence>
        {editingItem && (
          <EditModal 
            item={editingItem} 
            onClose={() => setEditingItem(null)} 
            onSave={handleUpdateMedia}
            onDelete={handleDeleteMedia}
          />
        )}
      </AnimatePresence>

      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        onSave={handleSaveChallenge}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-secondary-accent/90 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-center px-6 pb-safe">
        <div className="flex items-center justify-between w-full max-w-md">
          <button
            onClick={() => setActivePage('tracker')}
            className={`flex flex-col items-center gap-1 transition-all ${activePage === 'tracker' ? 'text-primary-accent' : 'text-zinc-300 hover:text-white'}`}
          >
            <LayoutGrid className={`w-6 h-6 ${activePage === 'tracker' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Tracker</span>
          </button>

          <button
            onClick={() => setActivePage('backlog')}
            className={`flex flex-col items-center gap-1 transition-all ${activePage === 'backlog' ? 'text-primary-accent' : 'text-zinc-300 hover:text-white'}`}
          >
            <Bookmark className={`w-6 h-6 ${activePage === 'backlog' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Backlog</span>
          </button>

          <button
            onClick={() => setActivePage('analytics')}
            className={`flex flex-col items-center gap-1 transition-all ${activePage === 'analytics' ? 'text-primary-accent' : 'text-zinc-300 hover:text-white'}`}
          >
            <BarChart3 className={`w-6 h-6 ${activePage === 'analytics' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Analytics</span>
          </button>

          <button
            onClick={() => setActivePage('settings')}
            className={`flex flex-col items-center gap-1 transition-all ${activePage === 'settings' ? 'text-primary-accent' : 'text-zinc-300 hover:text-white'}`}
          >
            <SettingsIcon className={`w-6 h-6 ${activePage === 'settings' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
          </button>
        </div>
      </nav>

      <MosaicLaunch 
        isVisible={showLaunch} 
        onComplete={() => setShowLaunch(false)} 
      />
    </Layout>
  );
}
