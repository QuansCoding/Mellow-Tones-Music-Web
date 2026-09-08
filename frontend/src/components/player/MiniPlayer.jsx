import { usePlayer } from './playerContext';
import { useScrubber } from './useScrubber';
import { formatTime } from '../../utils/format';
import Artwork from '../common/Artwork';
import { Play, Pause, SkipForward } from '../icons/Icons';

/**
 * Bottom transport bar for narrow/vertical layouts — the pattern every mobile
 * music app converges on. Replaces the 272px sidebar device with a 64px strip
 * pinned to the bottom edge; tapping the metadata expands the full sheet.
 *
 * Hidden above 1024px by CSS, but always mounted, so the shared <audio>
 * element is never torn down when the viewport crosses the breakpoint.
 *
 * The progress line doubles as a scrubber. It stays 3px visually, but its
 * input carries a 17px hit strip straddling the bar's top edge — for a
 * horizontal slider you only need enough vertical target to *start* the drag,
 * after which the pointer is captured and vertical position stops mattering.
 */
export default function MiniPlayer() {
  const {
    current, isPlaying, currentTime, duration,
    toggle, next, seek, openSheet, hasTrack,
  } = usePlayer();

  const scrubber = useScrubber({ currentTime, onSeek: seek });

  if (!hasTrack) return null;

  const total = duration || current?.duration_sec || 0;
  const pct = total ? (scrubber.value / total) * 100 : 0;

  return (
    <div className="mini" role="region" aria-label="Now playing">
      <label className="sr-only" htmlFor="mini-seek">Seek</label>
      <input
        id="mini-seek"
        className="mini__seek"
        type="range"
        min={0}
        max={total || 1}
        step={0.5}
        aria-valuetext={`${formatTime(scrubber.value)} of ${formatTime(total)}`}
        {...scrubber.inputProps}
        value={Math.min(scrubber.value, total || 1)}
        style={{ '--progress': `${pct}%` }}
      />

      <button type="button" className="mini__expand" onClick={openSheet}>
        <Artwork className="mini__art" alt={`Cover art for ${current.title}`} />
        <span className="mini__text">
          <span className="mini__title">{current.title}</span>
          {/* There are no numbers on a 3px line, so surface the drag target
              while scrubbing — otherwise you are aiming blind. */}
          <span className="mini__artist">
            {scrubber.scrubbing
              ? `${formatTime(scrubber.value)} / ${formatTime(total)}`
              : current.artist}
          </span>
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
