import { usePlayer } from './playerContext';
import Artwork from '../common/Artwork';
import { Play, Pause, SkipForward } from '../icons/Icons';

/**
 * Bottom transport bar for narrow/vertical layouts — the pattern every mobile
 * music app converges on. Replaces the 272px sidebar device with a 64px strip
 * pinned to the bottom edge; tapping the metadata expands the full sheet.
 *
 * Hidden above 1024px by CSS, but always mounted, so the shared <audio>
 * element is never torn down when the viewport crosses the breakpoint.
 */
export default function MiniPlayer() {
  const {
    current, isPlaying, currentTime, duration,
    toggle, next, openSheet, hasTrack,
  } = usePlayer();

  if (!hasTrack) return null;

  const total = duration || current?.duration_sec || 0;
  const pct = total ? (currentTime / total) * 100 : 0;

  return (
    <div className="mini" role="region" aria-label="Now playing">
      <div className="mini__progress" style={{ '--progress': `${pct}%` }} aria-hidden="true" />

      <button type="button" className="mini__expand" onClick={openSheet}>
        <Artwork className="mini__art" alt={`Cover art for ${current.title}`} />
        <span className="mini__text">
          <span className="mini__title">{current.title}</span>
          <span className="mini__artist">{current.artist}</span>
        </span>
        <span className="sr-only">Open now playing</span>
      </button>

      <div className="mini__controls">
        <button
          type="button"
          className="mini__btn mini__btn--play"
          onClick={toggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          type="button"
          className="mini__btn"
          onClick={next}
          aria-label="Next track"
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
}
