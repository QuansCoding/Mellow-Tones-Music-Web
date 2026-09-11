import { Link, useNavigate } from 'react-router-dom';
import { usePlayer } from '../player/playerContext';
import { useLibrary } from '../library/libraryContext';
import Artwork from '../common/Artwork';
import { Heart, Play, Pause } from '../icons/Icons';
import { formatCount, formatPlays, formatTime } from '../../utils/format';
import AddToPlaylistButton from '../library/AddToPlaylistButton';

const SKELETON_ROWS = 5;

function Row({ song, rank, songs, window }) {
  const navigate = useNavigate();
  const { current, isPlaying, playOrToggle } = usePlayer();
  const { isLiked, toggleLike, isSignedIn } = useLibrary();

  // Backed by the account's library on the server, so a like follows the user
  // to any device and is invisible to every other account.
  const liked = isSignedIn && isLiked(song.id);

  const isCurrent = current?.id === song.id;
  const nowPlaying = isCurrent && isPlaying;

  return (
    <div className={`trow${isCurrent ? ' trow--current' : ''}`} role="row">
      <span className="trow__rank" role="cell">
        <span className="trow__rank-num">{rank}</span>
        <button
          type="button"
          className="trow__play"
          onClick={() => playOrToggle(song, songs)}
          aria-label={nowPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
        >
          {nowPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </span>

      <span className="trow__art" role="cell">
        <Artwork alt={`${song.title} cover art`} />
      </span>

      <span className="trow__song" role="cell">
        <span className="trow__title">{song.title}</span>
        <span className="trow__artist">{song.artist}</span>
      </span>

      <span className="trow__album" role="cell">{song.album ?? '—'}</span>

      {/* The column is the all-time total — the number people expect next
          to a song. The ranking itself is by the last 24 hours, so that
          figure is on hover rather than competing in the same cell. */}
      <span
        className="trow__plays"
        role="cell"
        title={
          window === 'day' && song.window_plays != null
            ? `${formatPlays(song.window_plays)} in the last 24 hours`
            : undefined
        }
      >
        {song.play_count == null ? '—' : formatCount(song.play_count)}
      </span>

      <span className="trow__like" role="cell">
        <button
          type="button"
          className={`trow__heart${liked ? ' trow__heart--on' : ''}`}
          aria-pressed={liked}
          aria-label={
            !isSignedIn
              ? `Sign in to like ${song.title}`
              : liked ? `Unlike ${song.title}` : `Like ${song.title}`
          }
          // A like has to belong to someone, so send an anonymous visitor to
          // sign in rather than silently dropping the click.
          onClick={() => (isSignedIn ? toggleLike(song.id) : navigate('/login'))}
        >
          <Heart filled={liked} />
        </button>
        <AddToPlaylistButton song={song} className="trow__add" size={14} />
      </span>

      <span className="trow__length" role="cell">
        {formatTime(song.duration_sec)}
      </span>
    </div>
  );
}

/**
 * The home page's ranked songs. The Figma's placeholder rows are gone: while
 * loading the rows hold their shape as skeletons, and an empty catalogue says
 * so and points at Upload instead of showing made-up titles.
 */
export default function TrendingTable({ songs, window, loading = false }) {
  if (!loading && songs.length === 0) {
    return (
      <p className="section__note">
        No songs yet. <Link className="linkish" to="/create/upload">Upload the first one</Link>.
      </p>
    );
  }

  return (
    <div className="trending" role="table" aria-label="Trending songs">
      <div className="trow trow--head" role="row">
        <span aria-hidden="true" />
        <span className="trow__col trow__col--title" role="columnheader">TITLE</span>
        {/* Header cells reuse the data cells' column classes, so a single
            display:none rule drops a header and its column together. */}
        <span className="trow__col trow__album" role="columnheader">ALBUM</span>
        <span className="trow__col trow__plays" role="columnheader">PLAYS</span>
        <span aria-hidden="true" />
        <span className="trow__col trow__length" role="columnheader">LENGTH</span>
      </div>

      {loading
        ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <div key={i} className="trow trow--skeleton" aria-hidden="true" />
          ))
        : songs.map((song, i) => (
            <Row key={song.id} song={song} rank={i + 1} songs={songs} window={window} />
          ))}
    </div>
  );
}
