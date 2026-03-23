import { supabase } from '../lib/supabase';

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;

/**
 * Service to fetch game cover art via RAWG API (primary) or Supabase Edge Function (fallback)
 */
export const fetchGameCover = async (title: string): Promise<string | undefined> => {
  try {
    // Try RAWG API first if key is available
    if (RAWG_API_KEY) {
      console.log(`Fetching game cover for: "${title}" via RAWG API...`);
      const response = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&key=${RAWG_API_KEY}&page_size=1`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0 && data.results[0].background_image) {
          console.log(`Successfully found cover for "${title}" via RAWG:`, data.results[0].background_image);
          return data.results[0].background_image;
        }
      } else {
        console.warn('RAWG API request failed:', response.status);
      }
    } else {
      console.warn('VITE_RAWG_API_KEY is missing. Falling back to Supabase Edge Function.');
    }

    // Fallback to Supabase Edge Function
    if (!supabase) {
      console.warn('Supabase is not configured. Cannot fetch game cover.');
      return undefined;
    }

    console.log(`Fetching game cover for: "${title}" via Edge Function...`);

    const { data, error } = await supabase.functions.invoke('igdb-search', {
      body: { title }
    });

    if (error) {
      console.error('Error calling igdb-search function:', error);
      // If the function doesn't exist, this will be a 404 error
      if (error.message?.includes('404')) {
        console.error('The Edge Function "igdb-search" was not found. Please ensure it is deployed.');
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
