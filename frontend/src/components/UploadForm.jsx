import { useState } from 'react';
import { uploadSong } from '../api';
import { useGenres } from '../hooks/useGenres';

export default function UploadForm({ onUploaded }) {
  const genres = useGenres();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Read the real duration from the file instead of asking the user for it.
  function handleFile(e) {
    const f = e.target.files[0];
    setFile(f);
    if (!f) return;
    const audio = new Audio(URL.createObjectURL(f));
    audio.addEventListener('loadedmetadata', () => {
      setDuration(Math.round(audio.duration));
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await uploadSong(title, artist, duration, file, genre);
      setTitle(''); setArtist(''); setGenre(''); setFile(null); setDuration(0);
      e.target.reset();
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Upload a song</h2>
      {error && <div className="error">{error}</div>}

      <label className="field-label">Title</label>
      <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label className="field-label">Artist</label>
      <input className="field" value={artist} onChange={(e) => setArtist(e.target.value)} required />

      {/* Optional, and collected now though nothing filters on it yet: the
          filter is cheap to add later, but songs uploaded untagged in the
          meantime would all need tagging by hand. */}
      <label className="field-label" htmlFor="upload-genre">Genre (optional)</label>
      <select
        id="upload-genre"
        className="field"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        aria-describedby="upload-genre-hint"
      >
        <option value="">Not sure yet</option>
        {genres.map((g) => (
          <option key={g.id} value={g.id}>{g.label}</option>
        ))}
      </select>
      <p className="hint" id="upload-genre-hint">
        Helps listeners find it on Discover. You can change it later in Manage Songs.
      </p>

      <label className="field-label">Audio file (MP3, WAV, M4A — max 15 MB)</label>
      <input className="field" type="file" accept="audio/*" onChange={handleFile} required />
      {duration > 0 && <p className="hint">Detected length: {duration}s</p>}

      <button className="button button-primary" disabled={loading || !file}>
        {loading ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  );
}