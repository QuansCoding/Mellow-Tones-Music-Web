import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../../api';
import { useAuth } from '../auth/authContext';
import { LibraryContext } from './libraryContext';

const EMPTY = { likes: [], artists: [], playlists: [] };

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function fromApi(data) {
  return {
    likes: data.liked_song_ids,
    artists: data.favorite_artists,
    playlists: data.playlists.map((p) => ({
      id: p.id,
      name: p.name,
      songIds: p.song_ids,
    })),
  };
}

/**
 * The signed-in user's library, owned by the server.
 *
 * Two rules make this correct where localStorage was not:
 *
 *  - state is reloaded whenever the signed-in user changes and emptied when
 *    nobody is signed in, so one account can never show another's data;
 *  - every mutation is applied optimistically so a like still feels instant,
 *    and a failure re-reads from the server rather than guessing at what the
 *    previous state was.
 */
export default function LibraryProvider({ children }) {
  const { user, ready } = useAuth();
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = user?.id ?? null;

  // Reset the moment identity changes — during render, so the previous
  // account's library is never painted for the new one. Doing this in an
  // effect would show stale data for a frame.
  const [lastUserId, setLastUserId] = useState(userId);
  if (lastUserId !== userId) {
    setLastUserId(userId);
    setState(EMPTY);
    setError('');
    setLoading(Boolean(userId));
  }

  const reload = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const { data } = await api.fetchLibrary();
      setState(fromApi(data));
    } catch {
      setError('Could not load your library');
    }
  }, []);

  useEffect(() => {
    if (!ready || !userId) return undefined;

    let cancelled = false;
    api
      .fetchLibrary()
      .then(({ data }) => {
        if (cancelled) return;
        setState(fromApi(data));
        setError('');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your library');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, ready]);

  /**
   * Apply `apply` immediately, then send `request`. On failure re-read from
   * the server: it is the source of truth, and restoring a captured snapshot
   * would clobber any other change made in the meantime.
   */
  const mutate = useCallback(
    async (apply, request, message) => {
      setState(apply);
      try {
        await request();
        setError('');
      } catch {
        setError(message);
        reload();
      }
    },
    [reload],
  );

  const toggleLike = useCallback(
    (songId) => {
      const liked = state.likes.includes(songId);
      mutate(
        (s) => ({ ...s, likes: toggleIn(s.likes, songId) }),
        () => (liked ? api.unlikeSong(songId) : api.likeSong(songId)),
        liked ? 'Could not remove that like' : 'Could not save that like',
      );
    },
    [state.likes, mutate],
  );

  const toggleArtist = useCallback(
    (artist) => {
      if (!artist) return;
      const isFav = state.artists.some((a) => a.id === artist.id);
      mutate(
        (s) => ({
          ...s,
          artists: isFav
            ? s.artists.filter((a) => a.id !== artist.id)
            : [...s.artists, artist].sort((a, b) => a.name.localeCompare(b.name)),
        }),
        () => (isFav ? api.unfavoriteArtist(artist.id) : api.favoriteArtist(artist.id)),
        'Could not update your favourite artists',
      );
    },
    [state.artists, mutate],
  );

  // Creation needs the server-assigned id, so this one cannot be optimistic.
  const createPlaylist = useCallback(async (name) => {
    const clean = name.trim();
    if (!clean) return;
    try {
      const { data } = await api.createPlaylist(clean);
      setState((s) => ({
        ...s,
        playlists: [
          ...s.playlists,
          { id: data.id, name: data.name, songIds: data.song_ids },
        ],
      }));
      setError('');
    } catch (err) {
      setError(
        err?.response?.status === 409
          ? 'You already have a playlist with that name'
          : 'Could not create that playlist',
      );
    }
  }, []);

  const removePlaylist = useCallback(
    (id) => {
      mutate(
        (s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) }),
        () => api.deletePlaylist(id),
        'Could not delete that playlist',
      );
    },
    [mutate],
  );

  const togglePlaylistSong = useCallback(
    (playlistId, songId) => {
      const playlist = state.playlists.find((p) => p.id === playlistId);
      if (!playlist) return;
      const inList = playlist.songIds.includes(songId);
      mutate(
        (s) => ({
          ...s,
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, songIds: toggleIn(p.songIds, songId) } : p,
          ),
        }),
        () =>
          inList
            ? api.removeSongFromPlaylist(playlistId, songId)
            : api.addSongToPlaylist(playlistId, songId),
        'Could not update that playlist',
      );
    },
    [state.playlists, mutate],
  );

  const value = useMemo(() => {
    const isEmpty =
      state.likes.length === 0 &&
      state.artists.length === 0 &&
      state.playlists.length === 0;

    return {
      ...state,
      loading,
      error,
      isEmpty,
      isSignedIn: Boolean(userId),
      isLiked: (songId) => state.likes.includes(songId),
      isFavoriteArtist: (artistId) => state.artists.some((a) => a.id === artistId),
      toggleLike,
      toggleArtist,
      createPlaylist,
      removePlaylist,
      togglePlaylistSong,
    };
  }, [
    state, loading, error, userId,
    toggleLike, toggleArtist, createPlaylist, removePlaylist, togglePlaylistSong,
  ]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
