import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, Loader2, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MediaItem, MediaType, MediaStatus } from '../types';

interface FriendProfile {
  username: string;
  avatar_url?: string;
  email?: string;
}

interface FriendsFeedItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  imageUrl?: string;
  dateCompleted?: string;
  user_id: string;
  profiles?: FriendProfile;
}

interface FriendsViewProps {
  session: any;
  onAddToBacklog: (item: { title: string; type: MediaType; imageUrl?: string }) => Promise<void>;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ session, onAddToBacklog }) => {
  const [feedItems, setFeedItems] = useState<FriendsFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FriendsFeedItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const currentUserId = session?.user?.id;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchFriendsFeed = async () => {
    if (!isSupabaseConfigured || !currentUserId) {
      setFeedItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Pre-load from local storage cache to ensure immediate and offline content
      const cached = localStorage.getItem(`friends_feed_${currentUserId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFeedItems(parsed);
          }
        } catch (_) {}
      }

      // Check friendship connections with a timeout capability
      const { data: friends, error: friendsError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', currentUserId);

      if (friendsError) {
        throw friendsError;
      }

      const friendIds = friends?.map(f => f.friend_id) || [];
      
      if (friendIds.length === 0) {
        setFeedItems([]);
        localStorage.setItem(`friends_feed_${currentUserId}`, JSON.stringify([]));
        setLoading(false);
        return;
      }

      // 2. Fetch friend media completions
      const { data: feedData, error: mediaError } = await supabase
        .from('media_items')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .in('user_id', friendIds)
        .eq('status', 'completed');

      if (mediaError) {
        throw mediaError;
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const formattedFeed: FriendsFeedItem[] = (feedData || [])
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          status: item.status,
          imageUrl: item.imageUrl,
          dateCompleted: item.watchDate || item.endDate || item.dateCompleted || item.dateAdded || item.created_at,
          user_id: item.user_id,
          profiles: {
            username: item.profiles?.username || 'user',
            avatar_url: item.profiles?.avatar_url
          }
        }))
        .filter((item: FriendsFeedItem) => {
          const date = new Date(item.dateCompleted || 0);
          return !isNaN(date.getTime()) && date.getTime() >= sixMonthsAgo.getTime();
        });

      // Client-side descending sort by dateCompleted
      formattedFeed.sort((a, b) => {
        const dateA = new Date(a.dateCompleted || 0).getTime() || 0;
        const dateB = new Date(b.dateCompleted || 0).getTime() || 0;
        return dateB - dateA;
      });

      setFeedItems(formattedFeed);
      localStorage.setItem(`friends_feed_${currentUserId}`, JSON.stringify(formattedFeed));
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn('Friends feed fetch lookup skipped/offline:', errMsg);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsFeed();
  }, [currentUserId]);

  // Group items by month / year
  const groupedItems = feedItems.reduce((acc, item) => {
    const rawDate = item.dateCompleted;
    let date = new Date(rawDate || 0);
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    const currentMonthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    if (!acc[currentMonthYear]) {
      acc[currentMonthYear] = [];
    }
    acc[currentMonthYear].push(item);
    return acc;
  }, {} as Record<string, FriendsFeedItem[]>);

  // Longpress detection handlers
  const handleTouchStart = (item: FriendsFeedItem) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSelectedItem(item);
      setIsMenuOpen(true);
      if ('vibrate' in navigator) {
        try { navigator.vibrate(40); } catch (e) {}
      }
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCopyToBacklog = async (item: FriendsFeedItem) => {
    setAddingId(item.id);
    try {
      await onAddToBacklog({
        title: item.title,
        type: item.type,
        imageUrl: item.imageUrl
      });
      setAddedIds(prev => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
    } catch (err) {
      console.error('Failed to copy recommendation:', err);
    } finally {
      setAddingId(null);
      setTimeout(() => {
        setIsMenuOpen(false);
      }, 300);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-12 select-none">
      {/* Elegantly styled network timeout or offline warning banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[#e7e7e7] animate-fadeIn">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-red-400 font-bold block mb-0.5">
              Network Notification
            </span>
            <p className="text-xs text-[#e7e7e7]/90 leading-relaxed max-w-lg font-sans">
              Fehler beim Laden der Freunde ({error}). {feedItems.length > 0 ? "Showing recently cached activities from offline memory." : "Could not initialize connection with peer database records."}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchFriendsFeed}
            className="self-start sm:self-auto bg-red-400/10 hover:bg-red-400/20 active:scale-97 text-red-200 text-[10px] font-bold uppercase tracking-widest px-4.5 py-3 rounded-2xl transition-all border border-red-400/10"
          >
            Retry Connection
          </button>
        </div>
      )}

      {loading && feedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#576d87] gap-3 animate-fadeIn">
          <div className="w-5 h-5 border-2 border-primary-accent border-t-transparent rounded-full animate-spin mb-1" />
          <span className="text-xs font-mono uppercase tracking-widest">Gathering Friends Completed Archive</span>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-24 px-6 text-[#576d87] border border-dashed border-[#576d87]/20 rounded-3xl bg-white/[0.01]">
          <p className="text-sm font-medium text-zinc-300 mb-2 font-sans">Keine Aktivitäten gefunden</p>
          <p className="text-xs text-[#576d87] max-w-sm mx-auto leading-relaxed font-sans">
            Es sind bisher noch keine Aktivitäten im Feed vorhanden. Du kannst in den Einstellungen neue Freunde hinzufügen, um deren Updates hier zu sehen.
          </p>
          {error && (
            <button
              type="button"
              onClick={fetchFriendsFeed}
              className="mt-4 bg-white/5 hover:bg-white/10 active:bg-white/15 px-4.5 py-3 rounded-2xl text-[10px] font-bold tracking-wider uppercase transition-all inline-flex items-center gap-2 text-[#576d87] hover:text-[#e7e7e7]"
            >
              Retry Connection
            </button>
          )}
        </div>
      ) : (
        (Object.entries(groupedItems) as [string, FriendsFeedItem[]][]).map(([monthYear, monthItems]) => (
          <div key={monthYear} className="space-y-6">
            {/* Structural Month Header */}
            <div className="flex justify-between items-center pb-2 border-b border-[#576d87]/10">
              <span className="text-xs font-bold text-[#576d87] tracking-widest uppercase">{monthYear}</span>
              <span className="text-[10px] text-[#576d87]/60 font-mono uppercase tracking-wider">{monthItems.length} Connected Updates</span>
            </div>

            {/* 3-Column Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              {monthItems.map((item) => (
                <motion.div
                  key={item.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedItem(item);
                    setIsMenuOpen(true);
                  }}
                  onPointerDown={() => handleTouchStart(item)}
                  onPointerUp={handleTouchEnd}
                  onPointerLeave={handleTouchEnd}
                  whileTap={{ scale: 0.97 }}
                  className="relative aspect-[2/3] rounded-2xl overflow-hidden group cursor-pointer shadow-lg border border-white/5 bg-white/5"
                  title="Long press to inspect recommendations"
                >
                  {/* Cover Art */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#576d87]/10 flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-[10px] font-bold text-white/40 line-clamp-3 leading-tight uppercase tracking-wider">{item.title}</span>
                    </div>
                  )}

                  {/* Gradient bottom shadow layer for subtle contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80" />

                  {/* Top-Left Avatar badge */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <div className="h-7 w-7 rounded-full border border-[#242d3a]/60 bg-[#576d87] overflow-hidden flex items-center justify-center select-none shadow-md">
                      {item.profiles?.avatar_url ? (
                        <img
                          src={item.profiles.avatar_url}
                          alt={item.profiles.username}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-[#e7e7e7] uppercase">
                          {item.profiles?.username?.[0] || 'U'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hold helper tooltip for desktop */}
                  <div className="absolute bottom-2.5 right-2.5 bg-black/50 backdrop-blur-md rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={10} className="text-[#e7e7e7]" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Frame Motion custom context overlay */}
      <AnimatePresence>
        {isMenuOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Background blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-[#242d3a]/75 backdrop-blur-md"
            />

            {/* Context menu box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-[320px] bg-[#576d87] rounded-3xl overflow-hidden p-3 shadow-2xl border border-white/10 text-[#e7e7e7]"
            >
              {/* Media Card Detail Preview */}
              <div className="flex gap-4 p-3 border-b border-white/10 mb-2">
                {selectedItem.imageUrl ? (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    className="w-14 h-20 rounded-xl object-cover bg-white/5 shadow-md flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-20 bg-white/5 rounded-xl flex items-center justify-center text-[8px] font-bold text-white/40 text-center p-1 leading-tight flex-shrink-0 border border-white/10">
                    NO COVER
                  </div>
                )}
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[9px] uppercase tracking-widest font-mono text-white/60 block mb-0.5">
                    {selectedItem.type}
                  </span>
                  <h4 className="text-xs font-bold text-white leading-snug truncate">
                    {selectedItem.title}
                  </h4>
                  <div className="mt-2 flex items-center gap-1.5 min-w-0">
                    <img 
                      src={selectedItem.profiles?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedItem.profiles?.username}`}
                      className="h-4 w-4 rounded-full object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] font-medium text-white/80 truncate">
                      @{selectedItem.profiles?.username} tracked this
                    </span>
                  </div>
                </div>
              </div>

              {/* Read-Only info metadata */}
              <div className="px-4 py-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-white/50">
                Finished on: {formatDate(selectedItem.dateCompleted)}
              </div>

              {/* Copy to backlog button option */}
              <button
                type="button"
                disabled={addedIds.has(selectedItem.id) || addingId === selectedItem.id}
                onClick={() => handleCopyToBacklog(selectedItem)}
                className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-xs font-bold rounded-2xl transition-all ${
                  addedIds.has(selectedItem.id) 
                    ? 'bg-emerald-500/10 text-emerald-300' 
                    : 'bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  {addedIds.has(selectedItem.id) ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Added to Backlog</span>
                    </>
                  ) : addingId === selectedItem.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white/60" />
                      <span>Saving recommendation...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Add to my Backlog</span>
                    </>
                  )}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-white/40">RECOMMENDED</span>
              </button>

              {/* Dismiss controller anchor */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center text-[10px] uppercase tracking-widest text-white/40 pt-3 pb-1 hover:text-white transition-colors"
                id="dismiss_friends_modal"
              >
                Dismiss control pad
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
