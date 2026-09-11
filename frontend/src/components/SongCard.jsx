import { useState } from 'react';
import { usePlayer } from './player/playerContext';
import { genreLabel, useGenres } from '../hooks/useGenres';

export default function SongCard({ song, onPlay, onEdit, onDelete }) {
  const { current, isPlaying } = usePlayer();
  const genres = useGenres();
  const nowPlaying = current?.id === song.id && isPlaying;
  const mins = Math.floor(song.duration_sec / 60);
  const secs = String(song.duration_sec % 60).padStart(2, '0');

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [genre, setGenre] = useState(song.genre ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function startEdit() {
    setTitle(song.title);
    setArtist(song.artist);
    setGenre(song.genre ?? '');
    setErr('');
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await onEdit(song.id, {
        title: title.trim(),
        artist: artist.trim(),
        genre: genre || null,
      });
      setEditing(false);
    } catch {
      setErr('Could not save those changes');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form className="song-card" onSubmit={save}>
        <label className="sr-only" htmlFor={`title-${song.id}`}>Title</label>
        <input
          id={`title-${song.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <label className="sr-only" htmlFor={`artist-${song.id}`}>Artist</label>
        <input
          id={`artist-${song.id}`}
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          required
        />
        <label className="sr-only" htmlFor={`genre-${song.id}`}>Genre</label>
        <select
          id={`genre-${song.id}`}
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          <option value="">No genre</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
        {err && <p className="error">{err}</p>}
        <div className="song-actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="song-card">
      <h3>{song.title}</h3>
      <p className="artist">
        {song.artist}
        {genreLabel(genres, song.genre) && ` · ${genreLabel(genres, song.genre)}`}
      </p>
      <p className="dur">{mins}:{secs}</p>
      <div className="song-actions">
        <button className="button button-primary" onClick={() => onPlay(song)}>
          {nowPlaying ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button className="button" onClick={startEdit}>
          Edit
        </button>
        <button className="button button-danger" onClick={() => onDelete(song.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
