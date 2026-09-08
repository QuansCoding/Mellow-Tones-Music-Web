import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scrub behaviour for a <input type="range"> bound to the transport.
 *
 * A range input fires `input` on every pointer move, so seeking directly from
 * onChange issues one `audio.currentTime =` per frame — roughly 30 seeks for a
 * single drag, each one a fresh HTTP Range request. Measured on this player it
 * produced 26 buffer stalls in half a second, which is what made scrubbing
 * sound broken.
 *
 * So: the drag moves the thumb locally and nothing else, and exactly one seek
 * is committed when the pointer (or key) is released.
 */
export function useScrubber({ currentTime, onSeek }) {
  const [scrubTime, setScrubTime] = useState(null);
  // Mirrors scrubTime so commit() can read it without being re-created on
  // every pointer move.
  const pending = useRef(null);

  const scrubbing = scrubTime !== null;
  const value = scrubbing ? scrubTime : currentTime;

  const commit = useCallback(() => {
    if (pending.current === null) return;
    onSeek(pending.current);
    pending.current = null;
    setScrubTime(null);
  }, [onSeek]);

  // A drag can end anywhere on the page, not just over the slider.
  useEffect(() => {
    if (!scrubbing) return;
    window.addEventListener('pointerup', commit);
    window.addEventListener('pointercancel', commit);
    return () => {
      window.removeEventListener('pointerup', commit);
      window.removeEventListener('pointercancel', commit);
    };
  }, [scrubbing, commit]);

  const handleChange = useCallback((e) => {
    const next = Number(e.target.value);
    pending.current = next;
    setScrubTime(next);
  }, []);

  return {
    value,
    scrubbing,
    inputProps: {
      value,
      onChange: handleChange,
      // Covers a tap so fast that the window listener has not attached yet.
      onPointerUp: commit,
      // Arrow keys fire `input` while held; commit once on release.
      onKeyUp: commit,
      onBlur: commit,
    },
  };
}
