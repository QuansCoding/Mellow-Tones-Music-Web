import { getSongStreamUrl } from '../api';

export default function Player({ song }) {
  if (!song) return <div className="player empty">Select a song to play</div>;

  return (
    <div className="player">
      <strong>{song.title}</strong> — {song.artist}
      <audio controls autoPlay src={getSongStreamUrl(song.id)} />
    </div>
  );
}