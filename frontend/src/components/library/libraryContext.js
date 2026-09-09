import { createContext, useContext } from 'react';

/**
 * The signed-in user's library: liked songs, favourite artists and playlists.
 *
 * Backed by the API and scoped server-side to the bearer token. It previously
 * lived in localStorage, which is keyed by browser rather than identity — so
 * every account on a machine, and the signed-out state, shared one bucket.
 */
export const LibraryContext = createContext(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
