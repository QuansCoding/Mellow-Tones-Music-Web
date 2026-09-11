import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSongStreamUrl, recordPlay } from '../../api';
import { PlayerContext } from './playerContext';

// Seconds of audio actually heard before a listen counts as a play — the
// usual industry line between "listened" and "skipped past".
const PLAY_THRESHOLD_SEC = 30;

/**
 * Owns the single <audio> element and all transport state.
 *
 * Mount this once, above the router, so the element survives navigation and
 * the desktop/mobile player swap.
 */
export default function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  // Where the queue came from ({ playlistId }), so a play can be credited to
  // the playlist it was heard in — that is what ranks playlists on Home.
  const contextRef = useRef(null);
  // Listening progress for the loaded track. Refs, not state: it changes
  // four times a second and nothing renders from it.
  const listenRef = useRef({
    songId: null, playlistId: null, listened: 0, last: 0, counted: false,
  });

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
    listenRef.current = {
      songId: current.id,
      playlistId: contextRef.current?.playlistId ?? null,
      listened: 0,
      last: 0,
      counted: false,
    };
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

    // A seek is asynchronous: between setting currentTime and the `seeked`
    // event, `timeupdate` still reports the OLD position. Letting that through
    // yanks the slider back to where the user just dragged from.
    // A play counts after 30s of audio actually heard — not 30s after
    // pressing play, and not a drag of the scrubber to 0:30. Only the small
    // forward steps between timeupdates (~4 a second) are added up, so seeks
    // and rewinds contribute nothing and pausing simply stops the clock.
    const countListening = () => {
      const listen = listenRef.current;
      const t = audio.currentTime;
      const step = t - listen.last;
      listen.last = t;
      if (step > 0 && step < 1.5) listen.listened += step;

      // A song shorter than the threshold counts once nearly all of it is heard.
      const need = Number.isFinite(audio.duration)
        ? Math.min(PLAY_THRESHOLD_SEC, audio.duration * 0.9)
        : PLAY_THRESHOLD_SEC;
      if (!listen.counted && listen.songId && listen.listened >= need) {
        listen.counted = true;
        // Fire and forget: a lost play count must never interrupt playback.
        recordPlay(listen.songId, listen.playlistId).catch(() => {});
      }
    };

    const onTime = () => {
      if (!audio.seeking) setCurrentTime(audio.currentTime);
      countListening();
    };
    const onSeeked = () => {
      setCurrentTime(audio.currentTime);
      listenRef.current.last = audio.currentTime;
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      // Hearing it through again may count again (the server's cooldown
      // decides) — without this, replaying the last track never could.
      Object.assign(listenRef.current, { listened: 0, last: 0, counted: false });
      setIndex((i) => (i + 1 < queue.length ? i + 1 : i));
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue.length]);

  /* --- Actions -------------------------------------------------------- */
  const playSong = useCallback((song, list, context = null) => {
    contextRef.current = context;
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

  /**
   * Play this song, or pause/resume it if it is already the current track.
   *
   * Every surface that starts a song wants exactly this, and until now each
   * one called playSong directly — so pressing an already-playing tile
   * restarted it instead of pausing. Trending and the playlist rows had each
   * hand-rolled the check; the rest had not. Transport behaviour belongs in
   * the transport, once.
   */
  const playOrToggle = useCallback(
    (song, list, context) => {
      if (song && current?.id === song.id) toggle();
      else if (song) playSong(song, list, context);
    },
    [current, toggle, playSong],
  );

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

    const max = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    const clamped = Math.min(Math.max(0, time), max);
    if (!Number.isFinite(clamped)) return;

    try {
      audio.currentTime = clamped;
      // Optimistic: `timeupdate` still reports the old position until the
      // seek completes, and the UI should follow the user, not the buffer.
      setCurrentTime(clamped);
    } catch {
      // Seeking before the element has metadata throws in some browsers.
    }
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
      playOrToggle,
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
      playSong, playOrToggle, toggle, next, prev, seek, setVolume, nudgeVolume,
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
