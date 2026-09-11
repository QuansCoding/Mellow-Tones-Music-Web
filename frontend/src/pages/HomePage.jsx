import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchHome } from '../api';
import { useAuth } from '../components/auth/authContext';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayPlaylist, usePlaylistPlayback } from '../hooks/usePlayPlaylist';
import SectionHeader from '../components/home/SectionHeader';
import MediaCard from '../components/home/MediaCard';
import TrendingTable from '../components/home/TrendingTable';
import PlaylistCard from '../components/library/PlaylistCard';
import LikeButton from '../components/library/LikeButton';
import { formatPlays } from '../utils/format';
import '../components/home/home.css';
import '../components/library/library.css';

// Which ranking each section ended up on. The server falls back from "today"
// to all time when a quiet day could not fill a row, and to newest-first when
// nothing has been played yet — and the page says so rather than presenting
// either as today's chart.
const TAGS = { day: 'Today', all: 'All time' };
const FROM_HOME = { back: { to: '/', label: 'Home' } };

function SkeletonGrid({ variant, count, grid }) {
  return (
    <ul className={`grid ${grid}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={`card card--${variant} card--skeleton`} />
      ))}
    </ul>
  );
}

/**
 * The front page, read from the database.
 *
 * Every tile leads somewhere real: playlists open (or play from their
 * artwork), artists open their page, trending rows play. While loading, the
 * sections hold their shape with skeleton tiles so nothing jumps when the
 * data lands.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const lib = useLibrary();
  const playPlaylist = usePlayPlaylist();
  const playbackOf = usePlaylistPlayback();

  const [home, setHome] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHome()
      .then(({ data }) => {
        if (!cancelled) setHome(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <section className="stub">
        <h1 className="stub__title">Couldn’t load the home page</h1>
        <p className="stub__blurb">
          The server didn’t respond. Check that the API is running, then reload.
        </p>
      </section>
    );
  }

  // Your own playlist opens its editable page; anyone else's the public one.
  const openPlaylist = (p) => {
    const mine = lib.playlists.some((own) => own.id === p.id);
    navigate(mine ? `/library/playlists/${p.id}` : `/playlists/${p.id}`, { state: FROM_HOME });
  };

  const playlistsNew = home?.playlists_window === 'new';
  const artistsNew = home?.artists_window === 'new';
  const trendingNew = home?.trending_window === 'new';

  return (
    <>
      <section className="section" aria-labelledby="playlists-title" aria-busy={!home}>
        <SectionHeader
          title={playlistsNew ? 'Recently Shared Playlists' : 'Top Playlists'}
          tag={home?.playlists.length ? TAGS[home.playlists_window] : null}
          id="playlists-title"
        />
        {!home ? (
          <SkeletonGrid variant="album" count={7} grid="grid--albums" />
        ) : home.playlists.length > 0 ? (
          <ul className="grid grid--albums">
            {home.playlists.map((p) => {
              const { playable, playing } = playbackOf(p);
              return (
                <PlaylistCard
                  key={p.id}
                  variant="album"
                  playlist={{ ...p, songIds: p.song_ids }}
                  subtitle={`by ${p.owner}`}
                  playable={playable}
                  playing={playing}
                  onPlay={() => playPlaylist(p)}
                  onOpen={() => openPlaylist(p)}
                />
              );
            })}
          </ul>
        ) : (
          <p className="section__note">
            No one has shared a playlist yet.{' '}
            {isLoggedIn ? (
              <>
                Open one of <Link className="linkish" to="/library/playlists">your playlists</Link>{' '}
                and switch it to Public to feature it here.
              </>
            ) : (
              <>
                <Link className="linkish" to="/login">Sign in</Link> to share one of yours.
              </>
            )}
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="artists-title" aria-busy={!home}>
        <SectionHeader
          title={artistsNew ? 'Artists' : 'Popular Artists'}
          tag={home?.artists.length ? TAGS[home.artists_window] : null}
          id="artists-title"
        />
        {!home ? (
          <SkeletonGrid variant="artist" count={5} grid="grid--artists" />
        ) : home.artists.length > 0 ? (
          <ul className="grid grid--artists">
            {home.artists.map((a) => (
              <MediaCard
                key={a.id}
                variant="artist"
                title={a.name}
                // Plays once there are any; until then, what there is to hear.
                subtitle={
                  a.play_count > 0
                    ? formatPlays(a.play_count)
                    : `${a.song_count} ${a.song_count === 1 ? 'song' : 'songs'}`
                }
                onClick={() => navigate(`/artists/${a.id}`, { state: FROM_HOME })}
                actionLabel={`Open ${a.name}`}
                actions={<LikeButton artist={{ id: a.id, name: a.name }} />}
              />
            ))}
          </ul>
        ) : (
          <p className="section__note">Artists appear here as songs are uploaded.</p>
        )}
      </section>

      <section className="section section--trending" aria-labelledby="trending-title" aria-busy={!home}>
        <SectionHeader
          title={trendingNew ? 'New Releases' : 'Trending'}
          tag={home?.trending.length ? TAGS[home.trending_window] : null}
          id="trending-title"
        />
        <TrendingTable
          songs={home?.trending ?? []}
          window={home?.trending_window}
          loading={!home}
        />
      </section>
    </>
  );
}
