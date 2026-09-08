import { usePlayer } from './playerContext';
import { useScrubber } from './useScrubber';
import { formatTime } from '../../utils/format';
import Artwork from '../common/Artwork';
import {
  Play, Pause, SkipBack, SkipForward, VolumeUp, VolumeDown, Plus,
} from '../icons/Icons';
import './player.css';

/**
 * The Figma's handheld-device player. Desktop only — CSS hides it below
 * 1024px, where MiniPlayer takes over.
 *
 * The Figma's five buttons are blank rounded rectangles arranged in a D-pad.
 * Read as: wide-left = previous, top = volume up, centre = play/pause,
 * bottom = volume down, wide-right = next.
 */
export default function SidebarPlayer() {
  const {
    current, isPlaying, currentTime, duration,
    toggle, next, prev, seek, nudgeVolume, hasTrack,
  } = usePlayer();

  const scrubber = useScrubber({ currentTime, onSeek: seek });
  const total = duration || current?.duration_sec || 0;

  return (
    <section className="device" aria-label="Music player">
      <div className="device__screen">
        <Artwork alt={current ? `Cover art for ${current.title}` : 'No track loaded'} />
        <button type="button" className="device__add" aria-label="Add to playlist">
          <Plus size={12} />
        </button>
      </div>

      <label className="sr-only" htmlFor="device-seek">Seek</label>
      <input
        id="device-seek"
        className="device__seek"
        type="range"
        min={0}
        max={total || 1}
        step={0.5}
        disabled={!hasTrack}
        aria-valuetext={`${formatTime(scrubber.value)} of ${formatTime(total)}`}
        {...scrubber.inputProps}
        value={Math.min(scrubber.value, total || 1)}
        style={{ '--progress': `${total ? (scrubber.value / total) * 100 : 0}%` }}
      />

      <div className="device__meta">
        {/* Shows the drag target while scrubbing, the real position otherwise. */}
        <span className="device__time">{formatTime(scrubber.value)}</span>
        <span className="device__track">
          <span className="device__song">{current?.title ?? 'Song Name'}</span>
          <span className="device__artist">{current?.artist ?? 'Artist Name'}</span>
        </span>
        <span className="device__time">{formatTime(total)}</span>
      </div>

      <div className="device__pad">
        <button
          type="button"
          className="device__btn device__btn--vol-up"
          onClick={() => nudgeVolume(0.1)}
          aria-label="Volume up"
        >
          <VolumeUp size={14} />
        </button>

        <button
          type="button"
          className="device__btn device__btn--prev"
          onClick={prev}
          disabled={!hasTrack}
          aria-label="Previous track"
        >
          <SkipBack size={14} />
        </button>

        <button
          type="button"
          className="device__btn device__btn--play"
          onClick={toggle}
          disabled={!hasTrack}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          type="button"
          className="device__btn device__btn--next"
          onClick={next}
          disabled={!hasTrack}
          aria-label="Next track"
        >
          <SkipForward size={14} />
        </button>

        <button
          type="button"
          className="device__btn device__btn--vol-down"
          onClick={() => nudgeVolume(-0.1)}
          aria-label="Volume down"
        >
          <VolumeDown size={14} />
        </button>
      </div>
    </section>
  );
}
