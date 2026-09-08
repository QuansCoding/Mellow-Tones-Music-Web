import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSongStreamUrl } from '../../api';
import { PlayerContext } from './playerContext';

/**
 * Owns the single <audio> element and all transport state.
 *
 * Mount this once, above the router, so the element survives navigation and
 * the desktop/mobile player swap.
 */
export default function PlayerProvider({ children }) {
  const audioRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const current = index >= 0 ? (queue[index] ?? null) : null;

  /* --- Load a new source whenever the track changes ------------------- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    audio.src = getSongStreamUrl(current.id);
    audio.load();
    setCurrentTime(0);
    setDuration(current.duration_sec ?? 0);

    // Autoplay can be rejected before a user gesture; reflect reality rather
    // than showing a pause icon over silent audio.
    audio.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  }, [current]);

  /* --- Mirror the element's own events into state --------------------- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIndex((i) => (i + 1 < queue.length ? i + 1 : i));

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue.length]);

  /* --- Actions -------------------------------------------------------- */
  const playSong = useCallback((song, list) => {
    const nextQueue = list?.length ? list : [song];
    const at = nextQueue.findIndex((s) => s.id === song.id);
    setQueue(nextQueue);
    setIndex(at === -1 ? 0 : at);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [current]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1 < queue.length ? i + 1 : i));
  }, [queue.length]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    // Standard transport behaviour: restart the track unless we are near
    // its start, in which case step back one.
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((v) => {
    const clamped = Math.min(1, Math.max(0, v));
    const audio = audioRef.current;
    if (audio) audio.volume = clamped;
    setVolumeState(clamped);
  }, []);

  const nudgeVolume = useCallback(
    (delta) => setVolume((audioRef.current?.volume ?? 1) + delta),
    [setVolume],
  );

  const value = useMemo(
    () => ({
      current,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      sheetOpen,
      hasTrack: Boolean(current),
      playSong,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      nudgeVolume,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
    }),
    [
      current, queue, isPlaying, currentTime, duration, volume, sheetOpen,
      playSong, toggle, next, prev, seek, setVolume, nudgeVolume,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* The one and only audio element. Never conditionally rendered. */}
      <audio ref={audioRef} preload="metadata" />
    </PlayerContext.Provider>
  );
}
