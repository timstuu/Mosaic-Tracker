/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export async function fetchMediaPoster(title: string, type: 'movie' | 'show' | 'documentary'): Promise<string | undefined> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key missing. Please set VITE_TMDB_API_KEY in your environment.');
    return undefined;
  }

  try {
    const searchType = type === 'show' ? 'tv' : 'movie';
    const response = await fetch(
      `${BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // For documentaries, we might want to filter or just take the first result
      const posterPath = data.results[0].poster_path;
      if (posterPath) {
        return `${IMAGE_BASE_URL}${posterPath}`;
      }
    }
  } catch (error) {
    console.error('Error fetching from TMDB:', error);
  }
  return undefined;
}

export interface TMDbShowSearchResult {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date?: string;
  overview?: string;
}

export interface TMDbShowDetails {
  totalSeasons: number;
  totalEpisodes: number;
  imageUrl?: string;
}

export interface TMDbMovieSearchResult {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  overview?: string;
}

export async function searchMovies(query: string): Promise<TMDbMovieSearchResult[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key missing. Please set VITE_TMDB_API_KEY in your environment.');
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching movies from TMDB:', error);
    return [];
  }
}

export async function searchTVShows(query: string): Promise<TMDbShowSearchResult[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key missing. Please set VITE_TMDB_API_KEY in your environment.');
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching TV shows from TMDB:', error);
    return [];
  }
}

export async function fetchTVShowDetails(id: number): Promise<TMDbShowDetails | undefined> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key missing. Please set VITE_TMDB_API_KEY in your environment.');
    return undefined;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      totalSeasons: data.number_of_seasons || 1,
      totalEpisodes: data.number_of_episodes || 0,
      imageUrl: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : undefined,
    };
  } catch (error) {
    console.error('Error fetching TV show details from TMDB:', error);
    return undefined;
  }
}

export interface MediaSynopsis {
  genres: string[];
  summary: string;
}

export async function fetchMediaSynopsis(title: string, type: 'movie' | 'show' | 'documentary'): Promise<MediaSynopsis | undefined> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key missing. Please set VITE_TMDB_API_KEY in your environment.');
    return undefined;
  }

  try {
    const searchType = type === 'show' ? 'tv' : 'movie';
    const searchResponse = await fetch(
      `${BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    if (!searchResponse.ok) {
      throw new Error(`TMDB API error: ${searchResponse.status}`);
    }
    const searchData = await searchResponse.json();
    const match = searchData.results?.[0];
    if (!match) return undefined;

    const detailsResponse = await fetch(
      `${BASE_URL}/${searchType}/${match.id}?api_key=${TMDB_API_KEY}`
    );
    if (!detailsResponse.ok) {
      throw new Error(`TMDB API error: ${detailsResponse.status}`);
    }
    const details = await detailsResponse.json();

    return {
      genres: (details.genres || []).slice(0, 3).map((g: { name: string }) => g.name),
      summary: details.overview || match.overview || '',
    };
  } catch (error) {
    console.error('Error fetching synopsis from TMDB:', error);
    return undefined;
  }
}

export interface TMDbRecommendation {
  id: number;
  title: string;
  posterUrl?: string;
  releaseDate?: string;
  rating?: number;
  overview?: string;
}

export async function fetchSimilarRecommendations(
  title: string,
  type: 'movie' | 'show' | 'documentary'
): Promise<TMDbRecommendation[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key missing. Please set VITE_TMDB_API_KEY in your environment.');
    return [];
  }

  try {
    const searchType = type === 'show' ? 'tv' : 'movie';
    // 1. Search for the item to find its TMDB ID
    const searchResponse = await fetch(
      `${BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    
    if (!searchResponse.ok) {
      throw new Error(`TMDB Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    if (!searchData.results || searchData.results.length === 0) {
      return [];
    }

    const targetId = searchData.results[0].id;

    // 2. Fetch recommendations for this ID
    const recommendationsResponse = await fetch(
      `${BASE_URL}/${searchType}/${targetId}/recommendations?api_key=${TMDB_API_KEY}`
    );
    
    let results: any[] = [];
    if (recommendationsResponse.ok) {
      const recData = await recommendationsResponse.json();
      results = recData.results || [];
    }

    // Try falling back to /similar if no recommendations are found
    if (results.length === 0) {
      const similarResponse = await fetch(
        `${BASE_URL}/${searchType}/${targetId}/similar?api_key=${TMDB_API_KEY}`
      );
      if (similarResponse.ok) {
        const simData = await similarResponse.json();
        results = simData.results || [];
      }
    }

    return results.slice(0, 6).map((item: any) => ({
      id: item.id,
      title: item.title || item.name || '',
      posterUrl: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : undefined,
      releaseDate: item.release_date || item.first_air_date || '',
      rating: item.vote_average,
      overview: item.overview || ''
    }));

  } catch (error) {
    console.error('Error fetching similar recommendations from TMDB:', error);
    return [];
  }
}



export interface WatchProvider {
  id: number;
  name: string;
  logoUrl?: string;
}

export interface WatchProviderResult {
  providers: WatchProvider[];
  /** TMDB page that lists all offers for this title (data by JustWatch). */
  link?: string;
}

const LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92';

/**
 * Streaming services (subscription / "flatrate" only) where a title is available in a region.
 * Data comes from TMDB's watch provider endpoint, which is powered by JustWatch.
 * Documentaries are searched as movies first and as TV series if no movie matches.
 */
export async function fetchWatchProviders(
  title: string,
  type: 'movie' | 'show' | 'documentary',
  region = 'DE'
): Promise<WatchProviderResult | undefined> {
  if (!TMDB_API_KEY || !title.trim()) return undefined;

  const searchOrder: Array<'movie' | 'tv'> =
    type === 'show' ? ['tv'] : type === 'documentary' ? ['movie', 'tv'] : ['movie'];

  try {
    for (const searchType of searchOrder) {
      const searchResponse = await fetch(
        `${BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
      );
      if (!searchResponse.ok) throw new Error(`TMDB API error: ${searchResponse.status}`);
      const match = (await searchResponse.json()).results?.[0];
      if (!match) continue;

      const providerResponse = await fetch(
        `${BASE_URL}/${searchType}/${match.id}/watch/providers?api_key=${TMDB_API_KEY}`
      );
      if (!providerResponse.ok) throw new Error(`TMDB API error: ${providerResponse.status}`);
      const regionData = (await providerResponse.json()).results?.[region];

      const providers: WatchProvider[] = [...(regionData?.flatrate || [])]
        .sort((a: any, b: any) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
        .map((p: any) => ({
          id: p.provider_id,
          name: p.provider_name,
          logoUrl: p.logo_path ? `${LOGO_BASE_URL}${p.logo_path}` : undefined,
        }));

      return { providers, link: regionData?.link };
    }
    return { providers: [] };
  } catch (error) {
    console.error('Error fetching watch providers from TMDB:', error);
    return undefined;
  }
}

export interface NowPlayingMovie {
  id: number;
  title: string;
  originalTitle: string;
}

const NOW_PLAYING_CACHE_KEY = 'tmdb-now-playing-de';
const NOW_PLAYING_MAX_PAGES = 5;
let nowPlayingPromise: Promise<NowPlayingMovie[]> | undefined;

/** Lowercase, no accents, no punctuation: "Dune: Part Two" and "dune part two" match. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ß]+/g, ' ')
    .trim();
}

/**
 * Movies that run in German cinemas right now (TMDB "now_playing", region DE).
 * Loaded once per day: the list is cached in localStorage with today's date and
 * shared between all callers, so a long backlog costs only a few requests.
 */
export function fetchNowPlayingDE(): Promise<NowPlayingMovie[]> {
  if (nowPlayingPromise) return nowPlayingPromise;

  const today = new Date().toISOString().slice(0, 10);
  try {
    const cached = JSON.parse(localStorage.getItem(NOW_PLAYING_CACHE_KEY) || 'null');
    if (cached?.date === today && Array.isArray(cached.movies)) {
      nowPlayingPromise = Promise.resolve(cached.movies);
      return nowPlayingPromise;
    }
  } catch {
    // Storage blocked or corrupt: load from the API instead.
  }

  if (!TMDB_API_KEY) return Promise.resolve([]);

  nowPlayingPromise = (async () => {
    const movies: NowPlayingMovie[] = [];
    try {
      let totalPages = 1;
      for (let page = 1; page <= Math.min(totalPages, NOW_PLAYING_MAX_PAGES); page++) {
        const response = await fetch(
          `${BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&region=DE&language=de-DE&page=${page}`
        );
        if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
        const data = await response.json();
        totalPages = data.total_pages || 1;
        for (const m of data.results || []) {
          movies.push({ id: m.id, title: m.title || '', originalTitle: m.original_title || '' });
        }
      }
    } catch (error) {
      console.error('Error fetching now playing movies from TMDB:', error);
      // Do not cache a failed load, so the next app start tries again.
      nowPlayingPromise = undefined;
      return movies;
    }
    try {
      localStorage.setItem(NOW_PLAYING_CACHE_KEY, JSON.stringify({ date: today, movies }));
    } catch {
      // Storage full or blocked: the in-memory list still works for this session.
    }
    return movies;
  })();
  return nowPlayingPromise;
}

/** Google shows showtimes for cinemas near the viewer for this query. */
export function showtimesSearchUrl(title: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} Kino Spielzeiten`)}`;
}
