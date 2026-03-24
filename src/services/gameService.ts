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
      body: { game_title: title }
    });

    if (error) {
      console.error('Error calling get-game-cover function:', error);
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
