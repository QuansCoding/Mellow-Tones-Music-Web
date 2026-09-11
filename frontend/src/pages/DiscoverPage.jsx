import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDiscover } from '../api';
import { useAuth } from '../components/auth/authContext';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayer } from '../components/player/playerContext';
import { genreLabel, useGenres } from '../hooks/useGenres';
import SectionHeader from '../components/home/SectionHeader';
import MediaCard from '../components/home/MediaCard';
import LikeButton from '../components/library/LikeButton';
import AddToPlaylistButton from '../components/library/AddToPlaylistButton';
import { formatPlays } from '../utils/format';
import '../components/home/home.css';
import '../components/library/library.css';
import './discover.css';

const FROM_DISCOVER = { back: { to: '/discover', label: 'Discover' } };

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Section({ id, title, note, children }) {
  return (
    <section className="section" aria-labelledby={id}>
      <SectionHeader title={title} id={id} />
      {note && <p className="section__note discover__note">{note}</p>}
      {children}
    </section>
  );
}

/**
 * Discover: music you have not settled on yet.
 *
 * Home is what everyone is playing; this page is what *you* have not heard.
 * One big action up top — play something new, shuffled — then sections that
 * each explain why their songs are there. A song appears in one section
 * only, and sections with nothing to show are left out rather than shown
 * empty.
 *
 * Signed out you can browse and listen, but liking and playlists belong to an
 * account, so those controls are not offered at all (rather than offered and
 * then refused), and listening does not count towards plays.
 */
export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user, isLoggedIn, ready } = useAuth();
  const lib = useLibrary();
  const { current, isPlaying, playSong, playOrToggle, toggle } = usePlayer();
  const genres = useGenres();

  // Picks are personal, so the result is keyed to who is looking: signing in
  // or switching account refetches instead of showing someone else's picks.
  const viewer = ready ? (user?.id ?? 'guest') : null;
  const [result, setResult] = useState({ viewer: null, data: null, failed: false });
  // The ids "Play something new" queued, so its button can pause/resume
  // that session rather than reshuffle on every press.
  const [heroIds, setHeroIds] = useState(null);

  useEffect(() => {
    if (!viewer) return undefined;
    let cancelled = false;
    fetchDiscover()
      .then(({ data }) => {
        if (!cancelled) setResult({ viewer, data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ viewer, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  if (!viewer || result.viewer !== viewer) return null;

  if (result.failed) {
    return (
      <section className="stub">
        <h1 className="stub__title">Couldn’t load Discover</h1>
        <p className="stub__blurb">The server didn’t respond. Try again in a moment.</p>
      </section>
    );
  }

  const { data } = result;
  // Liking a song here takes it off the page at once: the one thing this
  // page never shows is music you have already said you love.
  const unliked = (list) => list.filter((s) => !lib.isLiked(s.id));
  const forYou = unliked(data.for_you);
  const fresh = unliked(data.fresh);
  const underRadar = unliked(data.under_radar);

  const heroPool = data.signed_in ? forYou : [...fresh, ...underRadar];
  const heroActive = Boolean(heroIds && current && heroIds.includes(current.id));

  function playSomethingNew() {
    if (heroActive) {
      toggle();
      return;
    }
    const queue = shuffle(heroPool);
    if (!queue.length) return;
    setHeroIds(queue.map((s) => s.id));
    playSong(queue[0], queue);
  }

  if (!heroPool.length && !fresh.length && !underRadar.length && !data.artists.length) {
    return (
      <section className="stub">
        <h1 className="stub__title">Nothing to discover yet</h1>
        <p className="stub__blurb">
          {data.signed_in && data.for_you.length + data.fresh.length > 0
            ? 'You’ve liked everything here. New uploads will show up on this page.'
            : 'Once songs are uploaded they’ll show up here.'}{' '}
          <Link className="linkish" to="/create/upload">Upload a song</Link>.
        </p>
      </section>
    );
  }

  const count = heroPool.length;
  const songs = `${count} ${count === 1 ? 'song' : 'songs'}`;
  let heroTitle = 'Find something new';
  let heroBlurb;
  if (!data.signed_in) {
    heroBlurb = (
      <>
        Shuffle through fresh and little-played songs.{' '}
        <Link className="linkish" to="/login">Sign in</Link> for picks based on what you
        haven’t heard yet.
      </>
    );
  } else if (!count) {
    heroTitle = 'You’ve liked everything new';
    heroBlurb = 'Nothing unheard is left. New uploads will show up here first.';
  } else if (data.all_heard) {
    heroTitle = 'You’ve heard everything';
    heroBlurb = `So here’s what you’ve played least — ${songs}, shuffled.`;
  } else {
    heroBlurb = `${songs} you haven’t heard yet, shuffled.`;
  }

  const songTile = (s, list) => {
    const isCurrent = current?.id === s.id;
    return (
      <MediaCard
        key={s.id}
        variant="album"
        title={s.title}
        // Genre rides along in the subtitle, so tagging on upload shows a
        // visible payoff before any filter exists.
        subtitle={[s.artist, genreLabel(genres, s.genre)].filter(Boolean).join(' · ')}
        active={isCurrent}
        onClick={() => playOrToggle(s, list)}
        actionLabel={isCurrent && isPlaying ? `Pause ${s.title}` : `Play ${s.title} by ${s.artist}`}
        actions={
          isLoggedIn ? (
            <>
              <AddToPlaylistButton song={s} />
              <LikeButton song={s} />
            </>
          ) : null
        }
      />
    );
  };

  return (
    <>
      <section className="discover__hero" aria-labelledby="discover-title">
        <p className="plhead__eyebrow">Discover</p>
        <h1 className="discover__title" id="discover-title">{heroTitle}</h1>
        <p className="discover__blurb">{heroBlurb}</p>
        <button
          type="button"
          className="button button-primary discover__play"
          onClick={playSomethingNew}
          disabled={!count}
        >
          {heroActive && isPlaying ? '❚❚ Pause' : '▶ Play something new'}
        </button>
      </section>

      {/* The genre filter row goes here. /discover already accepts ?genre=
          and every tile shows its genre, so adding it changes nothing else. */}

      {forYou.length > 0 && (
        <Section
          id="disc-for-you"
          title={data.all_heard ? 'Played least by you' : 'New to you'}
          note={
            data.all_heard
              ? 'You’ve heard everything — these are the ones you’ve come back to least.'
              : 'Songs you haven’t played yet.'
          }
        >
          <ul className="grid grid--fill">{forYou.map((s) => songTile(s, forYou))}</ul>
        </Section>
      )}

      {fresh.length > 0 && (
        <Section id="disc-fresh" title="Fresh uploads" note="Newest first.">
          <ul className="grid grid--fill">{fresh.map((s) => songTile(s, fresh))}</ul>
        </Section>
      )}

      {underRadar.length > 0 && (
        <Section
          id="disc-radar"
          title="Under the radar"
          note="The fewest plays so far — be one of the first to hear them."
        >
          <ul className="grid grid--fill">{underRadar.map((s) => songTile(s, underRadar))}</ul>
        </Section>
      )}

      {data.artists.length > 0 && (
        <Section
          id="disc-artists"
          title="Artists to try"
          note={data.signed_in ? 'Artists you haven’t favourited yet.' : null}
        >
          <ul className="grid grid--fill-wide">
            {data.artists.map((a) => (
              <MediaCard
                key={a.id}
                variant="artist"
                title={a.name}
                subtitle={
                  a.play_count > 0
                    ? formatPlays(a.play_count)
                    : `${a.song_count} ${a.song_count === 1 ? 'song' : 'songs'}`
                }
                onClick={() => navigate(`/artists/${a.id}`, { state: FROM_DISCOVER })}
                actionLabel={`Open ${a.name}`}
                actions={isLoggedIn ? <LikeButton artist={{ id: a.id, name: a.name }} /> : null}
              />
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
