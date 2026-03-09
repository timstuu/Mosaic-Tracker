/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export async function fetchMediaPoster(title: string, type: 'movie' | 'series' | 'documentary'): Promise<string | undefined> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API Key missing. Please set VITE_TMDB_API_KEY in your environment.');
    return undefined;
  }

  try {
    const searchType = type === 'series' ? 'tv' : 'movie';
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
