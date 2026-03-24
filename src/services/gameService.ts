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
