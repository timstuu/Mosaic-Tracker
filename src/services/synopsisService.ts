import { MediaType } from '../types';
import { fetchMediaSynopsis } from './tmdbService';
import { fetchBookSynopsis } from './bookService';
import { fetchGameSynopsis } from './gameService';

export interface Synopsis {
  genres: string[];
  summary: string;
}

const SUMMARY_HEADER = 'Summary:';
// A summary block is "Summary:\n<one paragraph>", ending at a blank line or the end of the notes.
const SUMMARY_BLOCK = /Summary:\n[\s\S]*?(?=\n\n|$)/;

/** Looks up a synopsis for any media type. Returns undefined when nothing usable is found. */
export async function fetchSynopsis(title: string, type: MediaType): Promise<Synopsis | undefined> {
  if (!title.trim()) return undefined;
  try {
    const result = type === MediaType.BOOK
      ? await fetchBookSynopsis(title)
      : type === MediaType.GAME
      ? await fetchGameSynopsis(title)
      : await fetchMediaSynopsis(title, type as 'movie' | 'show' | 'documentary');
    if (!result) return undefined;
    // Keep the summary to one paragraph so the block boundary in the notes stays unambiguous.
    const summary = (result.summary || '').replace(/\s*\n+\s*/g, ' ').trim();
    if (!summary && result.genres.length === 0) return undefined;
    return { summary, genres: result.genres };
  } catch (err) {
    console.warn('Synopsis lookup failed:', err);
    return undefined;
  }
}

/** Replaces an existing summary block in the notes, or appends one. Own notes stay unchanged. */
export function mergeSummaryIntoNotes(notes: string | undefined, summary: string): string {
  const current = notes || '';
  if (!summary) return current;
  const block = `${SUMMARY_HEADER}\n${summary}`;
  if (SUMMARY_BLOCK.test(current)) {
    return current.replace(SUMMARY_BLOCK, block);
  }
  return current.trim() ? `${current.trim()}\n\n${block}` : block;
}

/** Adds genres to a comma-separated tag string. Never removes existing tags. */
export function mergeGenresIntoTags(tags: string | undefined, genres: string[]): string {
  const list = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
  genres.forEach(genre => {
    if (!list.some(t => t.toLowerCase() === genre.toLowerCase())) list.push(genre);
  });
  return list.join(', ');
}

/** Fetches a synopsis and merges it into notes and tags. Returns the inputs unchanged when nothing is found. */
export async function enrichWithSynopsis(
  title: string,
  type: MediaType,
  notes: string | undefined,
  tags: string | undefined,
): Promise<{ notes: string; tags: string }> {
  const synopsis = await fetchSynopsis(title, type);
  if (!synopsis) return { notes: notes || '', tags: tags || '' };
  return {
    notes: mergeSummaryIntoNotes(notes, synopsis.summary),
    tags: mergeGenresIntoTags(tags, synopsis.genres),
  };
}
