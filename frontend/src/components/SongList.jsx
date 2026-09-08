import { useState, useEffect } from 'react';
import { fetchSongs, deleteSong } from '../api';
import SongCard from './SongCard';

export default function SongList({ refreshKey, onPlay }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reset to the loading state when a new fetch is about to run. Done during
  // render rather than inside the effect, which would cascade an extra render.
  const [lastKey, setLastKey] = useState(refreshKey);
  if (lastKey !== refreshKey) {
    setLastKey(refreshKey);
    setLoading(true);
    setError('');
  }

  useEffect(() => {
    let cancelled = false;
    fetchSongs()
      .then((res) => { if (!cancelled) setSongs(res.data); })
      .catch(() => { if (!cancelled) setError('Could not load your library'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };     // cleanup
  }, [refreshKey]);                          // re-run when a song is uploaded

  async function handleDelete(id) {
    if (!confirm('Delete this song?')) return;
    try {
      await deleteSong(id);
      setSongs(songs.filter((s) => s.id !== id));   // new array, not a mutation
    } catch {
      setError('Could not delete that song');
    }
  }

  if (loading) return <p className="loading">Loading your library…</p>;
  if (error)   return <div className="error">{error}</div>;
  if (songs.length === 0)
    return <div className="panel empty">No songs yet — upload one above.</div>;

  return (
    <div className="song-list">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} onPlay={onPlay} onDelete={handleDelete} />
      ))}
    </div>
  );
}