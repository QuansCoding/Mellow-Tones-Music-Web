import { useNavigate } from 'react-router-dom';
import { Heart } from '../icons/Icons';
import { useLibrary } from './libraryContext';

/**
 * Heart toggle for a song or an artist.
 *
 * Liking was reachable from the Trending rows but nowhere else, so there was
 * no way to *un*like from the one place likes actually live. The same held
 * for favourite artists. One control covers both: the two differ only in
 * which pair of library methods they call, not in what the button means.
 *
 * A like belongs to an account, so an anonymous visitor is sent to sign in
 * rather than having the click silently dropped — the same choice the
 * Trending heart already makes.
 */
export default function LikeButton({ song, artist, className = '', size = 16 }) {
  const navigate = useNavigate();
  const { isLiked, toggleLike, isFavoriteArtist, toggleArtist, isSignedIn } = useLibrary();

  const item = song ?? artist;
  if (!item) return null;

  const on = song ? isLiked(song.id) : isFavoriteArtist(artist.id);
  const name = song ? song.title : artist.name;
  const noun = song ? '' : ' as a favourite artist';

  const label = !isSignedIn
    ? `Sign in to like ${name}`
    : on
      ? `Remove ${name}${noun ? ' from your favourite artists' : ' from your liked songs'}`
      : `Like ${name}${noun}`;

  return (
    <button
      type="button"
      className={`likebtn${on ? ' likebtn--on' : ''} ${className}`.trim()}
      aria-pressed={on}
      aria-label={label}
      onClick={() => {
        if (!isSignedIn) navigate('/login');
        else if (song) toggleLike(song.id);
        else toggleArtist(artist);
      }}
    >
      <Heart size={size} filled={on} />
    </button>
  );
}
