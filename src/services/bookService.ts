/**
 * Service to interact with the Open Library API for book metadata and covers.
 */

export const fetchBookCover = async (title: string, isbn?: string): Promise<string | undefined> => {
  try {
    // If ISBN is provided, we can try to get the cover directly
    if (isbn) {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      if (cleanIsbn) {
        // We use the 'M' size for thumbnails, 'L' for larger views if needed
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false`;
        
        // Check if the image actually exists (Open Library returns 404 or a 1x1 pixel if not found with ?default=false)
        const response = await fetch(coverUrl, { method: 'HEAD' });
        if (response.ok) {
          return coverUrl;
        }
      }
    }

    // If no ISBN or ISBN cover not found, search by title
    const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return undefined;

    const data = await searchResponse.json();
    if (data.docs && data.docs.length > 0) {
      const book = data.docs[0];
      
      // Try to get cover by cover_i (internal ID)
      if (book.cover_i) {
        return `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
      }
      
      // Fallback to first ISBN if available
      if (book.isbn && book.isbn.length > 0) {
        return `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-M.jpg`;
      }
    }

    return undefined;
  } catch (error) {
    console.error('Error fetching book cover:', error);
    return undefined;
  }
};
