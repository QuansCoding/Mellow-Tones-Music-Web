import { useCallback } from 'react';
import { useCatalog } from '../components/catalog/catalogContext';
import { usePlayer } from '../components/player/playerContext';

/**
 * Play a playlist from the top, with the rest of it queued behind — or
 * pause/resume it if it is already the playlist you are listening to.
 *
 * The transport already supported the queue: playSong(song, list) sets it and
 * next/prev/auto-advance read from it. What was missing was the second press.
 * "Play all" restarted from track one every time, which threw away your place
 * three songs in; the test is whether the current track belongs to *this*
 * playlist, not whether it happens to be track one.
 *
 * Pass `{ restart: true }` where picking the playlist is a fresh choice
 * rather than a transport control — choosing one from the search dropdown
 * should start it, not pause what you just went looking for.
 */
export function usePlayPlaylist() {
  const { playSong, toggle, current } = usePlayer();
  const { resolve } = useCatalog();

  return useCallback(
    (playlist, { restart = false } = {}) => {
      // Library shape is songIds; the search endpoint returns song_ids.
      const list = resolve(playlist?.songIds ?? playlist?.song_ids);
      if (!list.length) return false;

      if (!restart && current && list.some((s) => s.id === current.id)) {
        toggle();
        return true;
      }
      // The context credits each play to this playlist, which ranks it on Home.
      playSong(list[0], list, { playlistId: playlist.id });
      return true;
    },
    [playSong, toggle, current, resolve],
  );
}

/**
 * Playback state for a playlist tile: is it playable, is it the one playing,
 * and is it playing right now.
 *
 * Pulled out so the pages stop re-deriving `resolve(p.songIds).length > 0`
 * inline and so the tile's icon can agree with what the transport is actually
 * doing.
 */
export function usePlaylistPlayback() {
  const { current, isPlaying } = usePlayer();
  const { resolve } = useCatalog();

  return useCallback(
    (playlist) => {
      const list = resolve(playlist?.songIds ?? playlist?.song_ids);
      const isCurrent = Boolean(current && list.some((s) => s.id === current.id));
      return { playable: list.length > 0, isCurrent, playing: isCurrent && isPlaying };
    },
    [current, isPlaying, resolve],
  );
}
