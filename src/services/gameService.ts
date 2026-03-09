import { supabase } from '../lib/supabase';

/**
 * Service to fetch game cover art via a Supabase Edge Function (igdb-search)
 */
export const fetchGameCover = async (title: string): Promise<string | undefined> => {
  try {
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
