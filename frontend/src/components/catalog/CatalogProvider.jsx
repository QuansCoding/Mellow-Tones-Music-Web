import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSongs } from '../../api';
import { CatalogContext } from './catalogContext';

export default function CatalogProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchSongs()
      .then(({ data }) => {
        if (!cancelled) setSongs(data);
      })
      .catch(() => {
        // A missing backend must not blank the app; pages fall back to their
        // own empty states.
        if (!cancelled) setSongs([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo(() => {
    const byId = Object.fromEntries(songs.map((s) => [s.id, s]));
    return {
      songs,
      loaded,
      byId,
      /** Stored ids -> playable songs, dropping anything no longer in the
       *  catalogue so a stale id cannot break playback. */
      resolve: (ids) => (ids ?? []).map((id) => byId[id]).filter(Boolean),
      refresh,
    };
  }, [songs, loaded, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
