import { createContext, useContext } from 'react';

/**
 * The user's library: liked songs, favourite artists and playlists.
 *
 * Persisted to localStorage rather than the API, because the backend has no
 * table for any of it yet — there is no playlists resource, no likes, no
 * favourites, and no /auth/me to attribute them to. Keeping the shape close
 * to what those endpoints would return means swapping the storage layer later
 * touches this file and nothing else.
 */
export const LibraryContext = createContext(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
