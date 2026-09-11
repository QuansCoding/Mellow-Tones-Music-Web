import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchAll } from '../api';
import { usePlayer } from '../components/player/playerContext';
import { usePlayPlaylist } from '../hooks/usePlayPlaylist';
import MediaCard from '../components/home/MediaCard';
import LikeButton from '../components/library/LikeButton';
import AddToPlaylistButton from '../components/library/AddToPlaylistButton';
import SectionHeader from '../components/home/SectionHeader';
import '../components/home/home.css';
import '../components/library/library.css';
import '../components/search/search.css';

const FULL_LIMIT = 50;
const EMPTY_RESULTS = { songs: [], artists: [], playlists: [] };

/** Everything behind the dropdown's "See all results". */
export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const { playOrToggle, current, isPlaying } = usePlayer();
  const playPlaylist = usePlayPlaylist();

  const [fetched, setFetched] = useState(EMPTY_RESULTS);
  // Which term `fetched` belongs to. Tracking it lets both `results` and
  // `loading` be derived, instead of synced from inside the effect.
  const [loadedFor, setLoadedFor] = useState(null);

  const term = query.trim();
  const settled = loadedFor === term;
  const results = term && settled ? fetched : EMPTY_RESULTS;
  const loading = Boolean(term) && !settled;

  useEffect(() => {
    if (!term) return undefined;

    let cancelled = false;
    searchAll(term, FULL_LIMIT)
      .then(({ data }) => {
        if (cancelled) return;
        setFetched(data);
        setLoadedFor(term);
      })
      .catch(() => {
        if (cancelled) return;
        setFetched(EMPTY_RESULTS);
        setLoadedFor(term);
      });

    return () => {
      cancelled = true;
    };
  }, [term]);

  const total =
    results.songs.length + results.artists.length + results.playlists.length;

  if (!term) {
    return (
      <section className="stub">
        <h1 className="stub__title">Search</h1>
        <p className="stub__blurb">
          Type in the box above to find songs, artists and your playlists.
        </p>
      </section>
    );
  }

  return (
    <>
      <h1 className="results__heading">
        Results for “{query}”{' '}
        {!loading && <span className="results__count">· {total} found</span>}
      </h1>

      {loading && <p className="section__note">Searching…</p>}

      {!loading && total === 0 && (
        <p className="section__note">
          Nothing matched “{query}”. Try a different spelling, or{' '}
          <Link className="linkish" to="/create/upload">upload a song</Link>.
        </p>
      )}

      {results.songs.length > 0 && (
        <section className="section" aria-labelledby="res-songs">
          <SectionHeader title="Songs" id="res-songs" />
          <ul className="grid grid--fill">
            {results.songs.map((s) => (
              <MediaCard
                key={s.id}
                variant="album"
                title={s.title}
                subtitle={s.artist}
                active={current?.id === s.id}
                // Queue the whole result set behind the one you picked.
                onClick={() => playOrToggle(s, results.songs)}
                actionLabel={
                  current?.id === s.id && isPlaying
                    ? `Pause ${s.title}`
                    : `Play ${s.title} by ${s.artist}`
                }
                actions={
                  <>
                    <AddToPlaylistButton song={s} />
                    <LikeButton song={s} />
                  </>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {results.artists.length > 0 && (
        <section className="section" aria-labelledby="res-artists">
          <SectionHeader title="Artists" id="res-artists" />
          <ul className="grid grid--fill">
            {results.artists.map((a) => (
              <MediaCard
                key={a.id}
                variant="album"
                title={a.name}
                actions={<LikeButton artist={a} />}
              />
            ))}
          </ul>
        </section>
      )}

      {results.playlists.length > 0 && (
        <section className="section" aria-labelledby="res-playlists">
          <SectionHeader title="Your Playlists" id="res-playlists" showAllTo="/library/playlists" />
          <ul className="grid grid--fill-wide">
            {results.playlists.map((p) => (
              <MediaCard
                key={p.id}
                variant="artist"
                title={p.name}
                subtitle={`${p.song_ids.length} ${p.song_ids.length === 1 ? 'song' : 'songs'}`}
                onClick={() => playPlaylist(p)}
                actionLabel={`Play ${p.name}`}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
