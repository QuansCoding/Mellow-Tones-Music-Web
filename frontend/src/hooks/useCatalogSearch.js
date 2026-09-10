import { useCallback, useEffect, useState } from 'react';
import { searchAll } from '../api';

const DEBOUNCE_MS = 180;
const EMPTY = [];

/**
 * Debounced, paged search over one group of `GET /search`.
 *
 * Shared by the library pickers and the playlist page's add panel, both of
 * which need the same thing: type a term, get a page of matches, ask for more.
 *
 * A blank term issues no request at all and resolves to an empty list — that
 * is what makes "start typing to find a song" free rather than a query for
 * every empty dialog that gets opened.
 *
 * @param {string} term  raw query text; trimmed here
 * @param {{kind?: 'songs'|'artists'|'playlists', limit?: number}} options
 */
export function useCatalogSearch(term, { kind = 'songs', limit = 20 } = {}) {
  const query = term.trim();

  const [pages, setPages] = useState(EMPTY);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  // Which query `pages` belongs to. Tracking it lets `results` and `loading`
  // be derived rather than written into state from inside the effect — the
  // same shape as SearchPage, and what keeps react-hooks/set-state-in-effect
  // satisfied.
  const [loadedFor, setLoadedFor] = useState('');
  const [exhausted, setExhausted] = useState(false);

  const settled = loadedFor === query;
  const results = query && settled ? pages : EMPTY;
  const loading = Boolean(query) && !settled;

  useEffect(() => {
    if (!query) return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      searchAll(query, limit, 0)
        .then(({ data }) => {
          if (cancelled) return;
          const page = data[kind] ?? [];
          setPages(page);
          setExhausted(page.length < limit);
          setError('');
          setLoadedFor(query);
        })
        .catch(() => {
          if (cancelled) return;
          setPages(EMPTY);
          setExhausted(true);
          setError('Search is unavailable right now');
          setLoadedFor(query);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kind, limit]);

  const loadMore = useCallback(async () => {
    if (!query || !settled || exhausted || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await searchAll(query, limit, pages.length);
      const page = data[kind] ?? [];
      // Guard against a late response for a term the user has moved on from.
      setPages((prev) => (prev === pages ? [...prev, ...page] : prev));
      setExhausted(page.length < limit);
    } catch {
      setError('Could not load more results');
    } finally {
      setLoadingMore(false);
    }
  }, [query, settled, exhausted, loadingMore, pages, kind, limit]);

  return {
    results,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(query) && settled && !exhausted,
    loadMore,
  };
}
