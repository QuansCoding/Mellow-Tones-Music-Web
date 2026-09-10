import { useState, useEffect } from 'react';
import { fetchMySongs, updateSong, deleteSong } from '../api';
import SongCard from './SongCard';

/**
 * The list behind the Manage page. Reads /songs/mine, so it only ever shows
 * songs the signed-in user uploaded — the edit and delete controls can't be
 * pointed at anyone else's work.
 */
export default function SongList({ onPlay }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchMySongs()
      .then((res) => { if (!cancelled) setSongs(res.data); })
      .catch(() => { if (!cancelled) setError('Could not load your songs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleEdit(id, changes) {
    const { data } = await updateSong(id, changes);          // throws on 4xx
    setSongs((list) => list.map((s) => (s.id === id ? data : s)));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this song?')) return;
    try {
      await deleteSong(id);
      setSongs((list) => list.filter((s) => s.id !== id));   // new array
    } catch {
      setError('Could not delete that song');
    }
  }

  if (loading) return <p className="loading">Loading your songs…</p>;
  if (error)   return <div className="error">{error}</div>;
  if (songs.length === 0)
    return <div className="panel empty">You haven't posted any songs yet — upload one first.</div>;

  return (
    <div className="song-list">
      {songs.map((song) => (
        <SongCard
          key={song.id}
          song={song}
          onPlay={(s) => onPlay(s, songs)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
