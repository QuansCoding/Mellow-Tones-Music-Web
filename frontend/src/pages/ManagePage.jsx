import SongList from '../components/SongList';
import { useCatalog } from '../components/catalog/catalogContext';
import { usePlayer } from '../components/player/playerContext';
import './pages.css';

export default function ManagePage() {
  const { playSong } = usePlayer();
  const { songs } = useCatalog();

  return (
    <section className="page" aria-labelledby="manage-title">
      <h1 className="page__title" id="manage-title">Manage Songs</h1>
      {/* Pass the catalogue as the queue — playing from here used to hand over
          a single song, so the transport had nothing to advance to. */}
      <SongList refreshKey={0} onPlay={(song) => playSong(song, songs)} />
    </section>
  );
}
