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

