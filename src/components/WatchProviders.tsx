import React, { useEffect, useState } from 'react';
import { Clapperboard, Loader2 } from 'lucide-react';
import { MediaType } from '../types';
import { fetchWatchProviders, showtimesSearchUrl, WatchProviderResult } from '../services/tmdbService';
import { useNowPlaying } from '../hooks/useNowPlaying';

interface WatchProvidersProps {
  title: string;
  type: MediaType;
}

/**
 * "Verfügbar in DE": subscription streaming services for movies, shows and documentaries.
 * Loaded fresh every time the detail view opens, so a title that changes service stays correct.
 */
export const WatchProviders: React.FC<WatchProvidersProps> = ({ title, type }) => {
  const isVisual = [MediaType.MOVIE, MediaType.SHOW, MediaType.DOCUMENTARY].includes(type);
  const [result, setResult] = useState<WatchProviderResult | undefined>();
  const [loading, setLoading] = useState(isVisual);
  const { isTitleInCinema } = useNowPlaying();
  const inCinema = (type === MediaType.MOVIE || type === MediaType.DOCUMENTARY) && isTitleInCinema(title);

  useEffect(() => {
    if (!isVisual) return;
    let active = true;
    setLoading(true);
    fetchWatchProviders(title, type as 'movie' | 'show' | 'documentary', 'DE').then(res => {
      if (!active) return;
      setResult(res);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [title, type, isVisual]);

  if (!isVisual) return null;
  // No API key or a network error: hide the section instead of showing a broken one.
  if (!loading && !result && !inCinema) return null;

  const cinemaChip = inCinema && (
    <a
      href={showtimesSearchUrl(title)}
      target="_blank"
      rel="noopener noreferrer"
      title="Spielzeiten in deiner Nähe"
      className="flex items-center gap-2 pl-1 pr-3 py-1 bg-app-bg border border-amber-400/30 hover:border-amber-400/60 rounded-xl transition-colors"
    >
      <span className="w-6 h-6 rounded-md bg-amber-400/10 flex items-center justify-center">
        <Clapperboard size={14} className="text-amber-400" />
      </span>
      <span className="text-xs text-zinc-200">Im Kino</span>
    </a>
  );

  return (
    <div className="w-full space-y-1.5">
      <span className="block text-[10px] font-bold text-[#576d87] uppercase tracking-widest">Verfügbar in DE</span>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500 p-1">
          <Loader2 size={12} className="animate-spin" /> Lade Streaming-Dienste…
        </div>
      ) : (result && result.providers.length > 0) || inCinema ? (
        <div className="flex flex-wrap gap-2">
          {cinemaChip}
          {result?.providers.map(provider => (
            <a
              key={provider.id}
              href={result?.link}
              target="_blank"
              rel="noopener noreferrer"
              title={provider.name}
              className="flex items-center gap-2 pl-1 pr-3 py-1 bg-app-bg border border-white/[0.06] hover:border-white/20 rounded-xl transition-colors"
            >
              {provider.logoUrl ? (
                <img src={provider.logoUrl} alt="" loading="lazy" className="w-6 h-6 rounded-md" />
              ) : (
                <span className="w-6 h-6 rounded-md bg-white/5" />
              )}
              <span className="text-xs text-zinc-200">{provider.name}</span>
            </a>
          ))}
          {inCinema && !result?.providers.length && (
            <span className="self-center text-xs text-zinc-500 italic">Bei keinem Abo-Dienst in DE.</span>
          )}
        </div>
      ) : (
        <div className="text-xs text-zinc-500 italic p-4 bg-app-bg rounded-xl border border-white/[0.03]">
          Aktuell bei keinem Abo-Dienst in DE.
        </div>
      )}
      <p className="text-[9px] text-zinc-600">Daten: JustWatch über TMDB</p>
    </div>
  );
};
