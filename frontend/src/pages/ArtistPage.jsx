import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchArtist } from '../api';
import { usePlayer } from '../components/player/playerContext';
import LikeButton from '../components/library/LikeButton';
import SongRows from '../components/library/SongRows';
import { ChevronLeft } from '../components/icons/Icons';
import { formatPlays } from '../utils/format';
import '../components/home/home.css';
import '../components/library/library.css';

/**
 * One artist: their songs, most played first, with Play all and the
 * favourite heart.
 *
 * Artist tiles used to lead nowhere (Home) or to a name search that mixed in
 * unrelated matches (the search dropdown). This is the one destination they
 * all share now.
 */
export default function ArtistPage() {
  const { artistId } = useParams();
  const location = useLocation();
  const back = location.state?.back ?? { to: '/', label: 'Home' };
  const { current, isPlaying, playSong, toggle } = usePlayer();

  // `id` records which artist the result belongs to, so "loading" is derived
  // rather than synced — navigating between artists never flashes the old one.
  const [result, setResult] = useState({ id: null, artist: null, status: null });

  useEffect(() => {
    let cancelled = false;
    fetchArtist(artistId)
      .then(({ data }) => {
        if (!cancelled) setResult({ id: artistId, artist: data, status: 'ok' });
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status === 404 ? 'missing' : 'error';
        setResult({ id: artistId, artist: null, status });
      });
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  const backLink = (
    <Link className="plhead__back" to={back.to}>
      <ChevronLeft size={16} />
      {back.label}
    </Link>
  );

  if (result.id !== artistId) return null;

  if (result.status !== 'ok') {
    return (
      <section className="stub">
        {backLink}
        <h1 className="stub__title">
          {result.status === 'missing' ? 'Artist not found' : 'Couldn’t load this artist'}
        </h1>
        <p className="stub__blurb">
          {result.status === 'missing'
            ? 'They may have been removed.'
            : 'The server didn’t respond. Try again in a moment.'}
        </p>
      </section>
    );
  }

  const { artist } = result;
  const songs = artist.songs;
  const isCurrent = songs.some((s) => s.id === current?.id);
  const playing = isCurrent && isPlaying;

  return (
    <>
      <header className="plhead">
        {backLink}
        <p className="plhead__eyebrow">Artist</p>
        <h1 className="plhead__title">{artist.name}</h1>
        <p className="plhead__meta">
          {artist.song_count} {artist.song_count === 1 ? 'song' : 'songs'} ·{' '}
          {formatPlays(artist.play_count)}
        </p>

        <div className="plhead__actions">
          <button
            type="button"
            className="button button-primary"
            disabled={songs.length === 0}
            // Same second-press rule as Play all on a playlist: if you are
            // already listening to this artist it pauses/resumes.
            onClick={() => (isCurrent ? toggle() : playSong(songs[0], songs))}
          >
            {playing ? '❚❚ Pause' : '▶ Play all'}
          </button>
          <LikeButton
            artist={{ id: artist.id, name: artist.name }}
            className="plhead__fav"
            size={20}
          />
        </div>
      </header>

      <section className="section" aria-labelledby="artist-songs">
        <h2 className="section__title" id="artist-songs">Songs</h2>
        {songs.length > 0 ? (
          <SongRows songs={songs} />
        ) : (
          <p className="section__note">No songs from this artist yet.</p>
        )}
      </section>
    </>
  );
}
