import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSongs } from '../../api';
import { CatalogContext } from './catalogContext';

const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

/**
 * The song catalogue, which liked songs and playlists resolve their ids
 * through.
 *
 * It used to be fetched exactly once: a single failed request — the API
 * restarting, a network blip — left it empty for the life of the tab, and
 * every liked song and playlist row silently vanished with it. Now a failure
 * keeps the last good list, is reported through `error`, and retries with
 * backoff, immediately when the window regains focus or the connection
 * comes back.
 */
export default function CatalogProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchSongs()
      .then(({ data }) => {
        if (cancelled) return;
        setSongs(data);
        setFailed(false);
        setAttempt(0);
      })
      .catch(() => {
        // Keep whatever loaded last: a blip must not empty a working library.
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!failed) return undefined;

    const retry = () => {
      setAttempt((a) => a + 1);
      setReloadKey((k) => k + 1);
    };
    const timer = setTimeout(retry, Math.min(MAX_RETRY_MS, FIRST_RETRY_MS * 2 ** attempt));
    window.addEventListener('focus', retry);
    window.addEventListener('online', retry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', retry);
      window.removeEventListener('online', retry);
    };
  }, [failed, attempt]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo(() => {
    const byId = Object.fromEntries(songs.map((s) => [s.id, s]));
    return {
      songs,
      loaded,
      /** True while the last fetch failed and a retry is pending. */
      error: failed,
      byId,
      /** Stored ids -> playable songs, dropping anything no longer in the
       *  catalogue so a stale id cannot break playback. */
      resolve: (ids) => (ids ?? []).map((id) => byId[id]).filter(Boolean),
      refresh,
    };
  }, [songs, loaded, failed, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
