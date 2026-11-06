/**
 * localStorage helpers that never throw.
 * A full storage quota (or a blocked storage in private mode) must not break a screen,
 * because the cache is only a convenience.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Could not write "${key}" to localStorage:`, err);
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

/** Inline data: URLs (for example Base64 avatars) can be hundreds of KB, so they never go into a cache. */
export function withoutInlineImage(url?: string): string | undefined {
  return url && url.startsWith('data:') ? undefined : url;
}
