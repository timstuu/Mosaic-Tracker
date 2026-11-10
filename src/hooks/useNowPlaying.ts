import { useEffect, useState } from 'react';
import { MediaItem, MediaStatus, MediaType } from '../types';
import { fetchNowPlayingDE, normalizeTitle } from '../services/tmdbService';

let titleIndex: Set<string> | undefined;
let idIndex: Set<number> | undefined;

/**
 * Loads the German "now in cinemas" list once and returns a matcher.
 * Entries store no TMDB id, so the match runs on the German and the original title.
 */
export function useNowPlaying() {
  const [ready, setReady] = useState(!!titleIndex);

  useEffect(() => {
    if (titleIndex) return;
    let active = true;
    fetchNowPlayingDE().then(movies => {
      if (movies.length === 0) return;
      titleIndex = new Set(movies.flatMap(m => [normalizeTitle(m.title), normalizeTitle(m.originalTitle)]).filter(Boolean));
      idIndex = new Set(movies.map(m => m.id));
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    ready,
    isTitleInCinema: (title: string) => !!titleIndex?.has(normalizeTitle(title)),
    isIdInCinema: (tmdbId: number) => !!idIndex?.has(tmdbId),
  };
}

/** Movies that are still to watch or being watched. Finished entries get no cinema icon. */
export function isCinemaCandidate(item: MediaItem): boolean {
  return (
    (item.type === MediaType.MOVIE || item.type === MediaType.DOCUMENTARY) &&
    (item.status === MediaStatus.PLANNED || item.status === MediaStatus.ACTIVE)
  );
}
