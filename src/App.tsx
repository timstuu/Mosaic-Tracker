/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { ActiveMediaShelf } from './components/ActiveMediaShelf';
import { MosaicLaunch } from './components/MosaicLaunch';
import { Analytics } from './components/Analytics';
import { ImportModal } from './components/ImportModal';
import { EditModal } from './components/EditModal';
import { MediaItem, MediaType, Challenge, MediaStatus } from './types';
import { Star, Search, X, LayoutGrid, BarChart3, Settings as SettingsIcon, Trash2, Database, Shield, Bookmark, ExternalLink, Film, Tv, Book, Gamepad2, Plus, Edit2, Trophy, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChallengeModal } from './components/ChallengeModal';

import { MosaicView } from './components/MosaicView';
import { MediaForm } from './components/MediaForm';

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const pageOrder: Page[] = ['tracker', 'backlog', 'analytics', 'settings'];
    const currentIndex = pageOrder.indexOf(activePage);

    if (offset < -swipeThreshold && velocity < -100) {
      if (currentIndex < pageOrder.length - 1) {
        setActivePage(pageOrder[currentIndex + 1]);
      }
    } else if (offset > swipeThreshold && velocity > 100) {
      if (currentIndex > 0) {
        setActivePage(pageOrder[currentIndex - 1]);
      }
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      const { data, error } = await supabase
        .from('media_items')
        .select('*');
      
      if (error) throw error;
      
      const filteredData = (data || []).filter(item => {
        if (!item.user_id) {
          console.warn(`Item ${item.id} (${item.title}) has no user_id and will be ignored.`);
          return false;
        }
        if (!currentUserId) return false;
        return item.user_id === currentUserId;
      });
      
      const normalizedData = filteredData.map(item => {
  // Nimmt den Status exakt so, wie er aus der Datenbank kommt.
  // Falls doch mal einer leer sein sollte, ist der Fallback 'planned'.
  let status = item.status?.toLowerCase().trim() || MediaStatus.PLANNED;
  
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const itemWithUser = { ...item, user_id: user.id };

      const { error } = await supabase
        .from('media_items')
        .insert(itemWithUser);
      
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const itemWithUser = { ...item, user_id: user.id };

      const { error } = await supabase
        .from('media_items')
        .update(itemWithUser)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const itemsWithUser = items.map(item => ({
        ...item,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('media_items')
        .insert(itemsWithUser);
      
      if (error) throw error;
      fetchMedia();
      alert(`Successfully imported ${items.length} items!`);
    } catch (error) {
      console.error('Error importing library:', error);
      alert('Failed to import items. Please check the console for details.');
    }
  };

  const handleExportData = (status?: MediaStatus) => {
    let itemsToExport = mediaItems;
    let filename = 'library-export.json';

    if (status) {
      itemsToExport = mediaItems.filter(item => item.status === status);
      filename = status === MediaStatus.COMPLETED ? 'tracker-history-export.json' : 'backlog-export.json';
    }

    if (itemsToExport.length === 0) {
      alert('No data to export.');
      return;
    }

    const cleanItems = itemsToExport.map(item => {
      const { id, user_id, ...rest } = item as any;
      return rest;
    });

    const jsonData = JSON.stringify(cleanItems, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const jsonUploadRef = React.useRef<HTMLInputElement>(null);

  const handleJsonImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) throw new Error('Invalid format: Expected an array of items');
        
        const itemsToImport = json.map(item => ({
          ...item,
          id: crypto.randomUUID()
        }));

        await handleImport(itemsToImport);
      } catch (err: any) {
        alert('Failed to parse JSON file: ' + err.message);
      }
      
      if (jsonUploadRef.current) {
        jsonUploadRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filteredAndSortedItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...mediaItems].sort((a, b) => {
        const dateA = new Date(a.watchDate || a.endDate || a.dateAdded || 0).getTime() || 0;
const dateB = new Date(b.watchDate || b.endDate || b.dateAdded || 0).getTime() || 0;
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
          try {
            if (!item || !item.title) return null;
            const rawDate = item.watchDate || item.endDate || item.dateAdded;
let date = new Date(rawDate || 0);
if (isNaN(date.getTime())) {
  date = new Date(0);
}
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
                         item.type === MediaType.SHOW ? <Tv size={14} /> :
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
          } catch (err) {
            console.error("Error rendering item in list:", item, err);
            return null;
          }
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
      i => i.status === MediaStatus.COMPLETED || i.status === MediaStatus.DNF
    );

    return (
      <div className="max-w-4xl mx-auto">
        <ActiveMediaShelf 
          items={activeItems} 
          onItemClick={setEditingItem} 
        />

        <div className="flex justify-end mb-4 mt-8 gap-4 font-sans">
          <button
            onClick={() => setViewMode('list')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'text-[#e7e7e7]' : 'text-[#576d87] hover:text-[#e7e7e7]'}`}
          >
            List
          </button>
          <span className="text-[#576d87]/30">/</span>
          <button
            onClick={() => setViewMode('mosaic')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${viewMode === 'mosaic' ? 'text-[#e7e7e7]' : 'text-[#576d87] hover:text-[#e7e7e7]'}`}
          >
            Mosaic
          </button>
        </div>

        <div className="overflow-hidden mb-24 font-sans">
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
      .sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());

    const groupedBacklog = Object.values(MediaType).reduce((acc, type) => {
      const items = backlogItems
        .filter(item => item.type === type)
       .sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());
      if (items.length > 0) acc[type] = items;
      return acc;
    }, {} as Record<MediaType, MediaItem[]>);

    const typeIcons = {
      [MediaType.MOVIE]: <Film size={14} />,
      [MediaType.SHOW]: <Tv size={14} />,
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
      <div className="max-w-4xl mx-auto px-0 pb-24 font-sans">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#e7e7e7] mb-2 font-sans tracking-tight">Backlog</h1>
          <p className="text-[#576d87] text-xs uppercase tracking-wider">Media you're planning to experience later.</p>
        </div>

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
                
                <div className="overflow-hidden">
                  {displayedItems.map((item) => {
                    try {
                      if (!item || !item.title) return null;
                      return (
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
                              href={item.link || ((item.type === MediaType.MOVIE || item.type === MediaType.SHOW || item.type === MediaType.DOCUMENTARY) ? 'https://www.werstreamt.es/filme-serien/?q=' + encodeURIComponent(item.title) : `https://www.google.com/search?q=${encodeURIComponent(item.title)}`)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-zinc-300 hover:text-primary-accent transition-colors"
                              title={item.link ? "Open Link" : ((item.type === MediaType.MOVIE || item.type === MediaType.SHOW || item.type === MediaType.DOCUMENTARY) ? "Auf WerStreamt.es suchen" : "Auf Google suchen")}
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
                      );
                    } catch (err) {
                      console.error("Error rendering item in backlog:", item, err);
                      return null;
                    }
                  })}
                  
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
            <div className="py-20 text-center border border-[#576d87]/10 rounded-2xl">
              <Bookmark className="w-10 h-10 text-[#576d87] mx-auto mb-4" />
              <p className="text-[#576d87] text-sm tracking-tight font-sans">Your backlog is empty.</p>
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
    <div className="max-w-4xl mx-auto px-0 pb-24 font-sans">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-[#e7e7e7] mb-2 font-sans tracking-tight">Settings</h1>
        <p className="text-[#576d87] text-xs uppercase tracking-wider">Manage your library and preferences.</p>
      </div>

      <div className="space-y-12">
        <div className="py-6 border-b border-[#576d87]/10">
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
            <button 
              onClick={() => handleExportData()}
              className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm text-white group-hover:text-white">Export Library (JSON)</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">All Data</span>
              </div>
              <div className="text-white">→</div>
            </button>
            <button 
              onClick={() => handleExportData(MediaStatus.COMPLETED)}
              className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm text-white group-hover:text-white">Export Tracker (JSON)</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Completed Items</span>
              </div>
              <div className="text-white">→</div>
            </button>
            <button 
              onClick={() => handleExportData(MediaStatus.PLANNED)}
              className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm text-white group-hover:text-white">Export Backlog (JSON)</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Planned Items</span>
              </div>
              <div className="text-white">→</div>
            </button>
            <button 
              onClick={() => jsonUploadRef.current?.click()}
              className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm text-white group-hover:text-white">Import Library (JSON)</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Restore from export</span>
              </div>
              <div className="text-white">→</div>
              <input 
                type="file" 
                ref={jsonUploadRef} 
                onChange={handleJsonImportChange} 
                accept=".json" 
                className="hidden" 
              />
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

        <div className="py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#e7e7e7]">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Privacy & Security</h3>
              <p className="text-xs text-[#576d87]">Control your tracking preferences.</p>
            </div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-[#e7e7e7] italic font-sans">Your data is stored securely in your private cloud database. You can export or clear your data at any time.</p>
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
    <Layout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      onSearchToggle={() => setIsSearchVisible(!isSearchVisible)}
      onAddClick={() => setIsAddModalOpen(true)}
    >
      <div className="max-w-4xl mx-auto px-0 font-sans">
        <AnimatePresence>
          {isSearchVisible && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your media library..."
                  className="w-full bg-[#242d3a] border border-[#576d87]/20 rounded-2xl pl-12 pr-12 py-4 text-[#e7e7e7] focus:outline-none focus:border-[#e7e7e7]/50 transition-all font-sans text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full text-zinc-400"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {searchQuery.trim() ? (
        renderSearchResults()
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className="w-full touch-pan-y"
          >
            {activePage === 'tracker' && renderTracker()}
            {activePage === 'backlog' && renderBacklog()}
            {activePage === 'analytics' && renderAnalytics()}
            {activePage === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
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

      <AnimatePresence>
        {isAddModalOpen && (
          <MediaForm 
            onClose={() => setIsAddModalOpen(false)} 
            onSave={(item) => {
              handleSaveMedia(item);
              setIsAddModalOpen(false);
            }} 
          />
        )}
      </AnimatePresence>

      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        onSave={handleSaveChallenge}
      />

      <MosaicLaunch 
        isVisible={showLaunch} 
        onComplete={() => setShowLaunch(false)} 
      />
    </Layout>
  );

}
