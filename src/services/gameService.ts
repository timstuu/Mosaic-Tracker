import { supabase } from '../lib/supabase';

/**
 * Service to fetch game cover art via a Supabase Edge Function (igdb-search)
 */
export const fetchGameCover = async (title: string): Promise<string | undefined> => {
  try {
    if (!supabase) return undefined;

    const { data, error } = await supabase.functions.invoke('igdb-search', {
      body: { title }
    });

    if (error) {
      console.error('Error calling igdb-search function:', error);
      return undefined;
    }

    return data?.coverUrl;
  } catch (err) {
    console.error('Failed to fetch game cover:', err);
    return undefined;
  }
};
