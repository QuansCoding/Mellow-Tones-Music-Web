import { createContext, useContext } from 'react';

/**
 * Shared transport state for the whole app.
 *
 * There is exactly one <audio> element, owned by PlayerProvider. The sidebar
 * player, the mobile mini-player and the Now Playing sheet are all *views* of
 * this context — none of them owns audio. That is what lets the layout swap
 * between them at 1024px without the element unmounting and restarting
 * playback from zero.
 */
export const PlayerContext = createContext(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
