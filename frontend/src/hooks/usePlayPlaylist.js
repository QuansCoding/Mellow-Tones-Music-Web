import { useCallback } from 'react';
import { useCatalog } from '../components/catalog/catalogContext';
import { usePlayer } from '../components/player/playerContext';

/**
 * Play a playlist from the top, with the rest of it queued behind.
 *
 * The transport already supported this — playSong(song, list) sets the whole
 * queue and next/prev/auto-advance read from it. Playlists were the only
 * collection never handed a list, because clicking one opened the editor.
 */
export function usePlayPlaylist() {
  const { playSong } = usePlayer();
  const { resolve } = useCatalog();

  return useCallback(
    (playlist) => {
      // Library shape is songIds; the search endpoint returns song_ids.
      const list = resolve(playlist?.songIds ?? playlist?.song_ids);
      if (!list.length) return false;
      playSong(list[0], list);
      return true;
    },
    [playSong, resolve],
  );
}
