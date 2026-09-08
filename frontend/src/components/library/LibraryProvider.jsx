import { useCallback, useEffect, useMemo, useState } from 'react';
import { LibraryContext } from './libraryContext';

const KEY = 'mellowtones.library.v2';
const LEGACY_KEY = 'mellowtones.library.v1';

const EMPTY = { likes: [], artists: [], playlists: [] };

/**
 * v1 kept downloads and likes as separate lists. They are now one list, with
 * Liked Songs as the surviving identity — so fold any saved downloads into
 * likes rather than dropping them on the floor.
 */
function migrate(v1) {
  return {
    likes: [...new Set([...(v1.likes ?? []), ...(v1.downloads ?? [])])],
    artists: v1.artists ?? [],
    playlists: v1.playlists ?? [],
  };
}

/** localStorage throws in private mode and when site data is blocked. */
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        likes: parsed.likes ?? [],
        artists: parsed.artists ?? [],
        playlists: parsed.playlists ?? [],
      };
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrate(JSON.parse(legacy));
      localStorage.setItem(KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }

    return EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Nothing to do — the library simply will not survive a reload.
  }
}

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function LibraryProvider({ children }) {
  const [state, setState] = useState(read);

  // Syncing to an external system is exactly what an effect is for.
  useEffect(() => write(state), [state]);

  const toggleLike = useCallback((id) => {
    setState((s) => ({ ...s, likes: toggleIn(s.likes, id) }));
  }, []);

  const toggleArtist = useCallback((name) => {
    setState((s) => ({ ...s, artists: toggleIn(s.artists, name) }));
  }, []);

  const createPlaylist = useCallback((name) => {
    const clean = name.trim();
    if (!clean) return;
    setState((s) => ({
      ...s,
      playlists: [
        ...s.playlists,
        { id: `pl_${Date.now()}_${s.playlists.length}`, name: clean, songIds: [] },
      ],
    }));
  }, []);

  const removePlaylist = useCallback((id) => {
    setState((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) }));
  }, []);

  const togglePlaylistSong = useCallback((playlistId, songId) => {
    setState((s) => ({
      ...s,
      playlists: s.playlists.map((p) =>
        p.id === playlistId ? { ...p, songIds: toggleIn(p.songIds, songId) } : p,
      ),
    }));
  }, []);

  const value = useMemo(() => {
    const isEmpty =
      state.likes.length === 0 &&
      state.artists.length === 0 &&
      state.playlists.length === 0;

    return {
      ...state,
      isEmpty,
      isLiked: (id) => state.likes.includes(id),
      isFavoriteArtist: (name) => state.artists.includes(name),
      toggleLike,
      toggleArtist,
      createPlaylist,
      removePlaylist,
      togglePlaylistSong,
    };
  }, [state, toggleLike, toggleArtist, createPlaylist, removePlaylist, togglePlaylistSong]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
