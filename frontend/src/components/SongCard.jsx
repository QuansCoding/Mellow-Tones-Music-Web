export default function SongCard({ song, onPlay, onDelete }) {
  const mins = Math.floor(song.duration_sec / 60);
  const secs = String(song.duration_sec % 60).padStart(2, '0');

  return (
    <div className="song-card">
      <h3>{song.title}</h3>
      <p className="artist">{song.artist}</p>
      <p className="dur">{mins}:{secs}</p>
      <div className="song-actions">
        <button className="button button-primary" onClick={() => onPlay(song)}>
          ▶ Play
        </button>
        <button className="button button-danger" onClick={() => onDelete(song.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}