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


