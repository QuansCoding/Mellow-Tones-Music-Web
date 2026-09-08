import { useState } from 'react';
import { uploadSong } from '../api';

export default function UploadForm({ onUploaded }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
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
      await uploadSong(title, artist, duration, file);
      setTitle(''); setArtist(''); setFile(null); setDuration(0);
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

      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label>Artist</label>
      <input value={artist} onChange={(e) => setArtist(e.target.value)} required />

      <label>Audio file (MP3, WAV, M4A — max 15 MB)</label>
      <input type="file" accept="audio/*" onChange={handleFile} required />
      {duration > 0 && <p className="hint">Detected length: {duration}s</p>}

      <button className="button button-primary" disabled={loading || !file}>
        {loading ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  );
}