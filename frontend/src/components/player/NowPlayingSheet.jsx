import { useEffect } from 'react';
import { usePlayer } from './playerContext';
import { useScrubber } from './useScrubber';
import { formatTime } from '../../utils/format';
import Artwork from '../common/Artwork';
import {
  Play, Pause, SkipBack, SkipForward, ChevronDown,
} from '../icons/Icons';
import AddToPlaylistButton from '../library/AddToPlaylistButton';

/**
 * Full-screen Now Playing view, expanded from the mini-player.
 *
 * This is where the sidebar device's detail goes on a phone: room for large
 * artwork, a real scrub bar and 56-64px transport targets, none of which fit
 * in a 64px strip.
 */
export default function NowPlayingSheet() {
  const {
    current, isPlaying, currentTime, duration, sheetOpen,
    toggle, next, prev, seek, closeSheet,
  } = usePlayer();

  const scrubber = useScrubber({ currentTime, onSeek: seek });

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e) => e.key === 'Escape' && closeSheet();
    window.addEventListener('keydown', onKey);
    // Stop the page behind the sheet from scrolling with it.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen, closeSheet]);

  if (!current) return null;

  const total = duration || current.duration_sec || 0;

  return (
    <div
      className={`sheet${sheetOpen ? ' sheet--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      aria-hidden={!sheetOpen}
    >
      <div className="sheet__bar">
        <button
          type="button"
          className="sheet__close"
          onClick={closeSheet}
          aria-label="Close now playing"
        >
          <ChevronDown size={24} />
        </button>
        <span className="sheet__eyebrow">Now Playing</span>
        {/* Mobile's counterpart to the sidebar device's + — the mini bar is
            too tight for another target, so it lives here. */}
        <AddToPlaylistButton song={current} className="sheet__add" size={20} />
      </div>

      <Artwork className="sheet__art" alt={`Cover art for ${current.title}`} />

      <div className="sheet__text">
        <h2 className="sheet__title">{current.title}</h2>
        <p className="sheet__artist">{current.artist}</p>
      </div>

      <div className="sheet__scrub">
        <label className="sr-only" htmlFor="sheet-seek">Seek</label>
        <input
          id="sheet-seek"
          className="sheet__seek"
          type="range"
          min={0}
          max={total || 1}
          step={0.5}
          aria-valuetext={`${formatTime(scrubber.value)} of ${formatTime(total)}`}
          {...scrubber.inputProps}
          value={Math.min(scrubber.value, total || 1)}
          style={{ '--progress': `${total ? (scrubber.value / total) * 100 : 0}%` }}
        />
        <div className="sheet__times">
          <span>{formatTime(scrubber.value)}</span>
          <span>{formatTime(total)}</span>
        </div>
      </div>

      <div className="sheet__controls">
        <button type="button" className="sheet__btn" onClick={prev} aria-label="Previous track">
          <SkipBack size={26} />
        </button>
        <button
          type="button"
          className="sheet__btn sheet__btn--play"
          onClick={toggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </button>
        <button type="button" className="sheet__btn" onClick={next} aria-label="Next track">
          <SkipForward size={26} />
        </button>
      </div>
    </div>
  );
}
