import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from '../icons/Icons';
import { useLibrary } from './libraryContext';
import AddToPlaylistDialog from './AddToPlaylistDialog';

/**
 * A "+" that adds a specific song to a playlist, wherever that song appears.
 *
 * Bundling the button with its dialog means each surface — the sidebar
 * player, the now-playing sheet, a Trending row — gets the behaviour without
 * repeating the open/close state three times.
 *
 * A playlist belongs to someone, so an anonymous visitor is sent to sign in
 * rather than having the click silently dropped. That mirrors what the heart
 * on a Trending row already does.
 */
export default function AddToPlaylistButton({ song, className = '', size = 14 }) {
  const navigate = useNavigate();
  const { isSignedIn } = useLibrary();
  const [open, setOpen] = useState(false);

  const label = !song
    ? 'Add to playlist'
    : !isSignedIn
      ? `Sign in to add ${song.title} to a playlist`
      : `Add ${song.title} to a playlist`;

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={!song}
        aria-label={label}
        onClick={() => (isSignedIn ? setOpen(true) : navigate('/login'))}
      >
        <Plus size={size} />
      </button>

      <AddToPlaylistDialog open={open} onClose={() => setOpen(false)} song={song} />
    </>
  );
}
