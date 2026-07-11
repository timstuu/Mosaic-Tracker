/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { BacklogRow } from './components/BacklogRow';
import { Settings } from './components/Settings';
import { FriendsView } from './components/FriendsView';
import { TrackerRow } from './components/TrackerRow';

type Page = 'tracker' | 'backlog' | 'analytics' | 'friends' | 'settings';

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
  const [backlogViewMode, setBacklogViewMode] = useState<'list' | 'mosaic'>('mosaic');
  const [expandedBacklogTypes, setExpandedBacklogTypes] = useState<Set<MediaType>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [trackerTab, setTrackerTab] = useState<'library' | 'friends'>('library');
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const lastFetchedUserIdRef = useRef<string | null>(null);

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const pageOrder: Page[] = ['tracker', 'backlog', 'analytics', 'friends', 'settings'];
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
    setShowAllCompleted(false);
  }, [activePage]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Listen for auth changes (this immediately fires with the initial session configuration)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, currentSession: any) => {
        setSession(currentSession);
        if (currentSession) {
          const uid = currentSession.user?.id;
          if (lastFetchedUserIdRef.current !== uid) {
            fetchMedia(uid);
            fetchChallenges(uid);
          }
        } else {
          lastFetchedUserIdRef.current = null;
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

  const fetchMedia = async (userIdOverride?: string, retryCount = 0) => {
    if (!isSupabaseConfigured) return;
    try {
      let currentUserId = userIdOverride;
      if (!currentUserId) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        currentUserId = currentSession?.user?.id;
      }
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      // Track last fetched user id to avoid duplicates
      lastFetchedUserIdRef.current = currentUserId;

      // Exact user_id database filtering to drastically reduce DB load and ensure privacy
      const { data, error } = await supabase
        .from('media_items')
        .select('id, user_id, title, type, status, rating, watchDate, endDate, dateAdded, imageUrl, tags, platform, console, notes')
        .eq('user_id', currentUserId);
      
      if (error) throw error;
      
      const normalizedData = (data || []).map(item => {
        let status = item.status?.toLowerCase().trim() || MediaStatus.PLANNED;
        return { 
          ...item, 
          status,
          currentSeason: item.current_season !== undefined && item.current_season !== null ? item.current_season : (item.currentSeason ?? 1),
          currentEpisode: item.current_episode !== undefined && item.current_episode !== null ? item.current_episode : (item.currentEpisode ?? 0),
          totalSeasons: item.total_seasons !== undefined && item.total_seasons !== null ? item.total_seasons : (item.totalSeasons ?? 1),
          totalEpisodes: item.total_episodes !== undefined && item.total_episodes !== null ? item.total_episodes : (item.totalEpisodes ?? 0),
        };
      });
      
      setMediaItems(normalizedData);
    } catch (err: any) {
      console.error('Failed to fetch media:', err);
      // If it's a transient fetch error, retry up to 2 times with exponential backoff
      if (retryCount < 2 && (err instanceof TypeError || String(err).includes('Failed to fetch') || err?.message?.includes('Failed to fetch'))) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Retrying fetchMedia in ${delay}ms... (Attempt ${retryCount + 1}/2)`);
        setTimeout(() => {
          fetchMedia(userIdOverride, retryCount + 1);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchChallenges = async (userIdOverride?: string, retryCount = 0) => {
    if (!isSupabaseConfigured) return;
    try {
      let currentUserId = userIdOverride;
      if (!currentUserId) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        currentUserId = currentSession?.user?.id;
      }
      if (!currentUserId) return;

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', currentUserId);
      
      if (error) throw error;
      setChallenges(data || []);
    } catch (err: any) {
      console.error('Failed to fetch challenges:', err);
      // Retry transient network errors
      if (retryCount < 2 && (err instanceof TypeError || String(err).includes('Failed to fetch') || err?.message?.includes('Failed to fetch'))) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Retrying fetchChallenges in ${delay}ms... (Attempt ${retryCount + 1}/2)`);
        setTimeout(() => {
          fetchChallenges(userIdOverride, retryCount + 1);
        }, delay);
      }
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

      const dbItem: any = { ...item };
      if (item.currentSeason !== undefined) dbItem.current_season = item.currentSeason;
      if (item.currentEpisode !== undefined) dbItem.current_episode = item.currentEpisode;
      if (item.totalSeasons !== undefined) dbItem.total_seasons = item.totalSeasons;
      if (item.totalEpisodes !== undefined) dbItem.total_episodes = item.totalEpisodes;

      delete dbItem.currentSeason;
      delete dbItem.currentEpisode;
      delete dbItem.totalSeasons;
      delete dbItem.totalEpisodes;

      const itemWithUser = { ...dbItem, user_id: user.id };

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

  const handleAddToBacklog = async (item: { title: string; type: MediaType; imageUrl?: string }) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const newItem = {
        title: item.title,
        type: item.type,
        status: MediaStatus.PLANNED,
        rating: 0,
        dateAdded: new Date().toISOString(),
        imageUrl: item.imageUrl,
        user_id: user.id
      };

      const { error } = await supabase
        .from('media_items')
        .insert(newItem);
      
      if (error) throw error;
      fetchMedia();
    } catch (error) {
      console.error('Failed to add recommendation to backlog:', error);
      throw error;
    }
  };

  const handleUpdateMedia = async (item: Partial<MediaItem>) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const dbItem: any = { ...item };
      if (item.currentSeason !== undefined) dbItem.current_season = item.currentSeason;
      if (item.currentEpisode !== undefined) dbItem.current_episode = item.currentEpisode;
      if (item.totalSeasons !== undefined) dbItem.total_seasons = item.totalSeasons;
      if (item.totalEpisodes !== undefined) dbItem.total_episodes = item.totalEpisodes;

      delete dbItem.currentSeason;
      delete dbItem.currentEpisode;
      delete dbItem.totalSeasons;
      delete dbItem.totalEpisodes;

      const itemWithUser = { ...dbItem, user_id: user.id };

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

  const handleIncrementEpisode = async (item: MediaItem) => {
    if (!isSupabaseConfigured) return;
    
    const nextEpisode = (item.currentEpisode ?? 0) + 1;
    let newStatus = item.status;
    let finishedDate = item.endDate;

    // Automated transition: If nextEpisode reaches totalEpisodes, transition to completed
    if (item.totalEpisodes && nextEpisode >= item.totalEpisodes) {
      newStatus = MediaStatus.COMPLETED;
      finishedDate = new Date().toISOString().split('T')[0];
    }

    const updatedProps: Partial<MediaItem> = {
      currentEpisode: nextEpisode,
      status: newStatus,
      endDate: finishedDate,
    };

    // Optimistic state update
    setMediaItems(prevItems => 
      prevItems.map(i => i.id === item.id ? { ...i, ...updatedProps } : i)
    );

    try {
      // Direct db sync
      const { error } = await supabase
        .from('media_items')
        .update({
          current_episode: nextEpisode,
          status: newStatus,
          "endDate": finishedDate,
        })
        .eq('id', item.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to sync inline episode increment to Supabase:', error);
      // Fallback reload if there is any error
      fetchMedia();
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

        {items.map((item) => {
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
              <TrackerRow
                key={item.id}
                item={item}
                isFirstInMonth={isFirstInMonth}
                currentMonthYear={currentMonthYear}
                date={date}
                onEdit={setEditingItem}
              />
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

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentCompleted = completedItems.filter(item => {
      const rawDate = item.watchDate || item.endDate || item.dateAdded;
      const date = new Date(rawDate || 0);
      return !isNaN(date.getTime()) && date.getTime() >= sixMonthsAgo.getTime();
    });

    const hasOlderItems = completedItems.length > recentCompleted.length;
    const displayedCompleted = showAllCompleted ? completedItems : recentCompleted;

    return (
      <div className="max-w-4xl mx-auto">
        <ActiveMediaShelf 
          items={activeItems} 
          onItemClick={setEditingItem} 
          onIncrementEpisode={handleIncrementEpisode}
          onUpdateMedia={handleUpdateMedia}
        />

        {/* Library subtitle and view mode switcher */}
        <div className="flex justify-between items-center border-b border-[#576d87]/10 pb-2 mb-8 mt-12 font-sans">
          <span className="text-[10px] uppercase tracking-widest font-bold text-white">Completed Archive</span>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'text-[#e7e7e7]' : 'text-[#576d87] hover:text-[#e7e7e7]'}`}
            >
              List
            </button>
            <span className="text-[#576d87]/20 text-[9px]">/</span>
            <button
              onClick={() => setViewMode('mosaic')}
              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${viewMode === 'mosaic' ? 'text-[#e7e7e7]' : 'text-[#576d87] hover:text-[#e7e7e7]'}`}
            >
              Mosaic
            </button>
          </div>
        </div>

        <div className="overflow-hidden mb-24 font-sans">
          {loading ? (
            <div className="p-12 text-center text-zinc-300 animate-pulse">Loading your library...</div>
          ) : displayedCompleted.length === 0 ? (
            <div className="p-24 text-center">
              <p className="text-[#576d87] text-xs italic">No completed entries found in the last 6 months.</p>
              {hasOlderItems && (
                <button
                  type="button"
                  onClick={() => setShowAllCompleted(true)}
                  className="mt-4 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5"
                >
                  Show older entries ({completedItems.length - recentCompleted.length})
                </button>
              )}
            </div>
          ) : viewMode === 'mosaic' ? (
            <div className="space-y-6">
              <MosaicView 
                items={displayedCompleted} 
                onItemClick={setEditingItem} 
              />
              {hasOlderItems && (
                <button
                  type="button"
                  onClick={() => setShowAllCompleted(!showAllCompleted)}
                  className="w-full py-4 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 hover:text-primary-accent transition-all border-t border-white/[0.02]"
                >
                  {showAllCompleted ? 'Show Less' : `Show Older Entries (${completedItems.length - recentCompleted.length} more)`}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {renderList(displayedCompleted)}
              {hasOlderItems && (
                <button
                  type="button"
                  onClick={() => setShowAllCompleted(!showAllCompleted)}
                  className="w-full py-4 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 hover:text-primary-accent transition-all border-t border-white/[0.02]"
                >
                  {showAllCompleted ? 'Show Less' : `Show Older Entries (${completedItems.length - recentCompleted.length} more)`}
                </button>
              )}
            </div>
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

        {/* Backlog View Mode Switcher */}
        <div className="flex justify-between items-center border-b border-[#576d87]/10 pb-2 mb-8 mt-4 font-sans">
          <span className="text-[10px] uppercase tracking-widest font-bold text-white">Backlog Queue</span>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBacklogViewMode('list')}
              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${backlogViewMode === 'list' ? 'text-[#e7e7e7]' : 'text-[#576d87] hover:text-[#e7e7e7]'}`}
            >
              List
            </button>
            <span className="text-[#576d87]/20 text-[9px]">/</span>
            <button
              onClick={() => setBacklogViewMode('mosaic')}
              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${backlogViewMode === 'mosaic' ? 'text-[#e7e7e7]' : 'text-[#576d87] hover:text-[#e7e7e7]'}`}
            >
              Mosaic
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedBacklog).map(([type, items]) => {
            const mediaType = type as MediaType;
            const isExpanded = expandedBacklogTypes.has(mediaType);
            const displayedItems = isExpanded ? items : items.slice(0, 9);
            const hasMore = items.length > 9;

            return (
              <div key={type} className="space-y-4">
                <div className="mb-4 px-2 py-1 border-b border-white/10 text-sm font-bold text-primary-accent uppercase tracking-widest flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-primary-accent/60">{typeIcons[mediaType]}</div>
                    <h3>
                      {type}s
                    </h3>
                    <span className="text-sm font-mono text-primary-accent/50 ml-1">({items.length})</span>
                  </div>
                </div>
                
                <div className="overflow-hidden">
                  {backlogViewMode === 'mosaic' ? (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 p-2">
                      {displayedItems.map((item) => {
                        try {
                          if (!item || !item.title) return null;
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileTap={{ scale: 0.98 }}
                              className="relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer shadow-lg shadow-black/40 border border-white/10"
                              onClick={() => setEditingItem(item)}
                            >
                              {item.imageUrl ? (
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.title} 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-zinc-500 p-2 text-center">
                                  <div className="text-primary-accent/60 mb-2">
                                    {typeIcons[mediaType]}
                                  </div>
                                  <span className="text-[10px] uppercase tracking-widest line-clamp-2">{item.title}</span>
                                </div>
                              )}
                            </motion.div>
                          );
                        } catch (err) {
                          console.error("Error rendering item in backlog mosaic:", item, err);
                          return null;
                        }
                      })}
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-white/[0.02] rounded-2xl bg-white/[0.01]">
                      {displayedItems.map((item) => {
                        try {
                          if (!item || !item.title) return null;
                          return (
                            <BacklogRow
                              key={item.id}
                              item={item}
                              typeIcons={typeIcons}
                              onMoveToTracker={handleMoveToTracker}
                              onEdit={(itemToEdit) => setEditingItem(itemToEdit)}
                            />
                          );
                        } catch (err) {
                          console.error("Error rendering item in backlog list:", item, err);
                          return null;
                        }
                      })}
                    </div>
                  )}
                  
                  {hasMore && (
                    <button
                      onClick={() => toggleExpand(mediaType)}
                      className="w-full py-4 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 hover:text-primary-accent transition-all border-t border-white/[0.02] mt-2"
                    >
                      {isExpanded ? 'Show Less' : `Show More (${items.length - 9} more)`}
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
    <Settings
      session={session}
      mediaItems={mediaItems}
      handleExportData={handleExportData}
      handleClearData={handleClearData}
      setImportMode={setImportMode}
      setIsImportModalOpen={setIsImportModalOpen}
      handleImport={handleImport}
      fetchMedia={fetchMedia}
    />
  );

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
            {activePage === 'friends' && <FriendsView session={session} onAddToBacklog={handleAddToBacklog} />}
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
            onAddToBacklog={handleAddToBacklog}
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
