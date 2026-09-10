import { createContext, useContext } from 'react';

/**
 * The song catalogue, fetched once.
 *
 * Home, Library and the Library list pages each used to fetch /songs
 * independently. They now share this, which also gives playlist playback a
 * way to resolve stored song ids into playable songs.
 */
export const CatalogContext = createContext(null);

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
