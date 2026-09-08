import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchSongs } from '../api';
import SectionHeader from '../components/home/SectionHeader';
import MediaCard from '../components/home/MediaCard';
import TrendingTable from '../components/home/TrendingTable';
import '../components/home/home.css';

// Album and artist tiles have no backing data yet — the Figma's own
// placeholder content stands in until the API grows those resources.
const ALBUMS = Array.from({ length: 7 }, (_, i) => ({ id: `album-${i}` }));
const ARTISTS = Array.from({ length: 5 }, (_, i) => ({ id: `artist-${i}` }));

export default function HomePage() {
  const { query } = useOutletContext();
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchSongs()
      .then((res) => { if (!cancelled) setSongs(res.data); })
      // A missing backend must not blank the page — TrendingTable falls
      // back to the Figma's placeholder rows.
      .catch(() => { if (!cancelled) setSongs([]); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
    );
  }, [songs, query]);

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
        <TrendingTable songs={filtered} />
      </section>
    </>
  );
}
