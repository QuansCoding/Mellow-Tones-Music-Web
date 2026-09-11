/** Seconds -> "m:ss". Returns "0:00" for null/NaN/negative. */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mins}:${secs}`;
}

/** Large play counts -> "1.2M" / "45.3K" / "2K" (no trailing ".0"). */
export function formatCount(n) {
  if (!Number.isFinite(n)) return '—';
  const short = (v, unit) => `${v.toFixed(1).replace(/\.0$/, '')}${unit}`;
  if (n >= 1_000_000) return short(n / 1_000_000, 'M');
  if (n >= 1_000) return short(n / 1_000, 'K');
  return String(n);
}

/** "1 play" / "12 plays" / "1.2K plays". */
export function formatPlays(n) {
  return `${formatCount(n)} ${n === 1 ? 'play' : 'plays'}`;
}
