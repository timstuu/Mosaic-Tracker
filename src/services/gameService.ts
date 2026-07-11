import { supabase } from '../lib/supabase';

/**
 * Service to fetch game cover art via Supabase Edge Function (IGDB)
 */
export const fetchGameCover = async (title: string): Promise<string | undefined> => {
  try {
    if (!supabase) {
      console.warn('Supabase is not configured. Cannot fetch game cover.');
      return undefined;
    }

    console.log(`Fetching game cover for: "${title}" via Edge Function...`);

    const { data, error } = await supabase.functions.invoke('get-game-cover', {
      body: { gameTitle: title }
    });

    if (error) {
      // Check if it's a fetch error (usually means not deployed or CORS issue)
      if (error.message === 'Failed to send a request to the Edge Function') {
        console.error('Edge Function not reachable. Please ensure you have deployed it using: supabase functions deploy get-game-cover');
      } else {
        console.error('Error calling get-game-cover function:', error.message || error);
      }
      return undefined;
    }

    if (!data?.coverUrl) {
      console.log(`No cover found for game: "${title}"`);
      return undefined;
    }

    console.log(`Successfully found cover for "${title}":`, data.coverUrl);
    return data.coverUrl;
  } catch (err) {
    console.error('Failed to fetch game cover:', err);
    return undefined;
  }
};

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;

export interface GameSearchResult {
  id: number;
  name: string;
  background_image: string | null;
  released?: string;
}

export const searchGames = async (query: string): Promise<GameSearchResult[]> => {
  if (!RAWG_API_KEY) {
    console.warn('VITE_RAWG_API_KEY missing. Please set it in your environment to enable game search.');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=5`
    );
    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching games from RAWG:', error);
    return [];
  }
};
