import SongList from '../components/SongList';
import { useAuth } from '../components/auth/authContext';
import { usePlayer } from '../components/player/playerContext';
import SignInPrompt from '../components/library/SignInPrompt';
import './pages.css';

/**
 * Manage Songs — restricted to the songs the signed-in user uploaded.
 *
 * The list, the edit form and the delete button all act on your own songs
 * only; the server enforces the same rule with a 403 on anything else.
 */
export default function ManagePage() {
  const { isLoggedIn, ready } = useAuth();
  const { playOrToggle } = usePlayer();

  if (!ready) return null;
  if (!isLoggedIn) return <SignInPrompt what="songs you've posted" />;

  return (
    <section className="page" aria-labelledby="manage-title">
      <h1 className="page__title" id="manage-title">Manage Songs</h1>
      <p className="page__note">Songs you've posted. Only you can edit or remove them.</p>
      {/* The queue is the list on screen — your own songs — so the transport
          advances through them rather than being handed a single track. */}
      <SongList onPlay={(song, mine) => playOrToggle(song, mine)} />
    </section>
  );
}
