import { useEffect, useRef, useState } from 'react';
import { fetchSeasonEpisodeCount, SeasonEpisodeInfo } from '../services/tmdbService';

/**
 * Fills "episodes in season" from TMDB whenever the show title or the season changes.
 * The field stays editable: a manual value is only replaced on the next title or season change.
 * With skipInitial, the values the form opened with are kept (an entry that already has a count).
 */
export function useSeasonEpisodeCount(
  title: string,
  season: number,
  enabled: boolean,
  onResult: (info: SeasonEpisodeInfo) => void,
  skipInitial = false
) {
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const initialKey = useRef(skipInitial ? `${title}|${season}` : '');
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!enabled || !title.trim()) return;
    if (`${title}|${season}` === initialKey.current) return;

    let active = true;
    // Wait until typing pauses, so each keystroke in the title does not hit TMDB.
    const timer = setTimeout(() => {
      setLoading(true);
      fetchSeasonEpisodeCount(title, season).then(info => {
        if (!active) return;
        setLoading(false);
        if (info && info.episodeCount > 0) {
          onResultRef.current(info);
          setAutoFilled(true);
        }
      });
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
      setLoading(false);
    };
  }, [title, season, enabled]);

  return { loading, autoFilled, clearAutoFilled: () => setAutoFilled(false) };
}
