import SongList from '../components/SongList';
import { usePlayer } from '../components/player/playerContext';
import './pages.css';

export default function ManagePage() {
  const { playSong } = usePlayer();

  return (
    <section className="page" aria-labelledby="manage-title">
      <h1 className="page__title" id="manage-title">Manage Songs</h1>
      <SongList refreshKey={0} onPlay={(song) => playSong(song)} />
    </section>
  );
}
