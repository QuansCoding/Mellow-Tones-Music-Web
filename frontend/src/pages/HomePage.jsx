import { useCatalog } from '../components/catalog/catalogContext';
import SectionHeader from '../components/home/SectionHeader';
import MediaCard from '../components/home/MediaCard';
import TrendingTable from '../components/home/TrendingTable';
import '../components/home/home.css';

// Album and artist tiles have no backing data yet — the Figma's own
// placeholder content stands in until the API grows those resources.
const ALBUMS = Array.from({ length: 7 }, (_, i) => ({ id: `album-${i}` }));
const ARTISTS = Array.from({ length: 5 }, (_, i) => ({ id: `artist-${i}` }));

export default function HomePage() {
  // Trending no longer reacts to the search box. Trending is a property of the
  // catalogue, not of what you happen to be typing — searching lives in the
  // combobox and its results page instead.
  const { songs } = useCatalog();

  return (
    <>
      <section className="section" aria-labelledby="albums-title">
        <SectionHeader title="Popular Albums" id="albums-title" showAllTo="/library" />
        <ul className="grid grid--albums">
          {ALBUMS.map((a) => (
            <MediaCard key={a.id} variant="album" title="Album" subtitle="# songs" />
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="artists-title">
        <SectionHeader title="Popular Artists" id="artists-title" showAllTo="/library/artists" />
        <ul className="grid grid--artists">
          {ARTISTS.map((a) => (
            <MediaCard key={a.id} variant="artist" title="Artist" />
          ))}
        </ul>
      </section>

      <section className="section section--trending" aria-labelledby="trending-title">
        <SectionHeader title="Trending Today" id="trending-title" />
        <TrendingTable songs={songs} />
      </section>
    </>
  );
}
