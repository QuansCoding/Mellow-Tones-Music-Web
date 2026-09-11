import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../components/auth/authContext';
import { useCatalog } from '../components/catalog/catalogContext';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayer } from '../components/player/playerContext';
import { usePlayPlaylist, usePlaylistPlayback } from '../hooks/usePlayPlaylist';
import SignInPrompt from '../components/library/SignInPrompt';
import SearchAddList from '../components/library/SearchAddList';
import Artwork from '../components/common/Artwork';
import { ChevronLeft, Close, Play, Pause } from '../components/icons/Icons';
import { formatTime } from '../utils/format';
import '../components/home/home.css';
import '../components/library/library.css';

/**
 * One playlist, with its songs and an inline search to add more.
 *
 * Editing a playlist used to mean a modal listing the whole catalogue, which
 * covered the very thing you were editing. Building a playlist is a session —
 * ten or twenty adds — so the list you are filling stays on screen above the
 * search, and each add lands in it immediately.
 */
export default function PlaylistPage() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, ready } = useAuth();

  // Back goes to wherever the playlist was opened from. It is a real link
  // rather than history.back(), so it still works after a reload or on a
  // pasted URL — both arrive with no state and fall back to Playlists.
  const back = location.state?.back ?? { to: '/library/playlists', label: 'Playlists' };
  const { resolve, error: catalogError } = useCatalog();
  const { current, isPlaying, playOrToggle } = usePlayer();
  const playPlaylist = usePlayPlaylist();
  const playbackOf = usePlaylistPlayback();
  const lib = useLibrary();

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [copied, setCopied] = useState(false);

  if (!ready) return null;
  if (!isLoggedIn) return <SignInPrompt what="your playlists" />;

  const playlist = lib.playlists.find((p) => p.id === playlistId);

  // The library may still be loading on a cold reload straight to this URL,
  // so an absent playlist is only really absent once the load has finished.
  if (!playlist) {
    if (lib.loading) return null;
    return (
      <section className="stub">
        <h1 className="stub__title">Playlist not found</h1>
        <p className="stub__blurb">
          It may have been deleted.{' '}
          <Link className="linkish" to="/library/playlists">Back to your playlists</Link>.
        </p>
      </section>
    );
  }

  const songs = resolve(playlist.songIds);
  const { playing: playlistPlaying } = playbackOf(playlist);
  const totalSec = songs.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0);

  function startRename() {
    setDraftName(playlist.name);
    setRenaming(true);
  }

  function submitRename(e) {
    e.preventDefault();
    if (draftName.trim()) lib.renamePlaylist(playlist.id, draftName);
    setRenaming(false);
  }

  function remove() {
    if (!confirm(`Delete the playlist “${playlist.name}”? The songs stay in the catalogue.`)) return;
    lib.removePlaylist(playlist.id);
    navigate(back.to);
  }

  function setPublic(next) {
    setCopied(false);
    lib.setPlaylistPublic(playlist.id, next);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/playlists/${playlist.id}`);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the button just does nothing then.
    }
  }

  return (
    <>
      {(lib.error || catalogError) && (
        <div className="error" role="alert">
          {lib.error || 'Couldn’t load songs from the server — retrying…'}
        </div>
      )}

      <header className="plhead">
        <Link className="plhead__back" to={back.to}>
          <ChevronLeft size={16} />
          {back.label}
        </Link>

        {renaming ? (
          <form className="plhead__rename" onSubmit={submitRename}>
            <label className="sr-only" htmlFor="playlist-name">Playlist name</label>
            <input
              id="playlist-name"
              className="finder__input"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="button button-primary">Save</button>
            <button type="button" className="button" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <h1 className="plhead__title">{playlist.name}</h1>
        )}

        <p className="plhead__meta">
          {songs.length} {songs.length === 1 ? 'song' : 'songs'}
          {songs.length > 0 && ` · ${formatTime(totalSec)}`}
        </p>

        <div className="plhead__actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => playPlaylist(playlist)}
            disabled={songs.length === 0}
          >
            {playlistPlaying ? '❚❚ Pause' : '▶ Play all'}
          </button>
          {!renaming && (
            <button type="button" className="button" onClick={startRename}>Rename</button>
          )}
          <button type="button" className="button button-danger" onClick={remove}>
            Delete playlist
          </button>
        </div>

        {/* A switch with a fixed label, not a button reading "Public"/"Private":
            a button labelled with a state is ambiguous about whether it shows
            the current state or the one you would switch to. The note spells
            out the consequence either way. */}
        <div className="plhead__share">
          <button
            type="button"
            role="switch"
            aria-checked={playlist.isPublic}
            className="plvis"
            onClick={() => setPublic(!playlist.isPublic)}
          >
            <span className="plvis__track" aria-hidden="true">
              <span className="plvis__knob" />
            </span>
            Public
          </button>
          <p className="plhead__note">
            {playlist.isPublic ? (
              <>
                Anyone can open and play this, and it can appear on the home page.{' '}
                <button type="button" className="linkish" onClick={copyLink}>
                  {copied ? 'Link copied' : 'Copy link'}
                </button>
              </>
            ) : (
              'Only you can see this playlist.'
            )}
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="pl-songs">
        <h2 className="section__title" id="pl-songs">Songs</h2>

        {songs.length === 0 ? (
          <p className="section__note">
            Nothing here yet. Find songs below to fill it.
          </p>
        ) : (
          <ul className="plrows">
            {songs.map((song, i) => {
              const isCurrent = current?.id === song.id;
              const nowPlaying = isCurrent && isPlaying;
              return (
                <li key={song.id} className={`plrow${isCurrent ? ' plrow--current' : ''}`}>
                  <button
                    type="button"
                    className="plrow__main"
                    // Queue the whole playlist behind whichever row is picked,
                    // so playing from the middle still advances to the end.
                    onClick={() => playOrToggle(song, songs, { playlistId: playlist.id })}
                    aria-label={nowPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                  >
                    <span className="plrow__index" aria-hidden="true">{i + 1}</span>
                    <span className="plrow__icon" aria-hidden="true">
                      {nowPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </span>
                    <Artwork className="plrow__art" alt={`${song.title} cover art`} />
                    <span className="plrow__text">
                      <span className="plrow__title">{song.title}</span>
                      <span className="plrow__artist">{song.artist}</span>
                    </span>
                    <span className="plrow__dur">{formatTime(song.duration_sec)}</span>
                  </button>
                  <button
                    type="button"
                    className="plrow__remove"
                    onClick={() => lib.togglePlaylistSong(playlist.id, song.id)}
                    aria-label={`Remove ${song.title} from ${playlist.name}`}
                  >
                    <Close size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="pl-add">
        <h2 className="section__title" id="pl-add">Add songs</h2>
        <SearchAddList
          kind="songs"
          placeholder="Search songs by title or artist"
          prompt="Start typing to find a song to add."
          isSelected={(song) => playlist.songIds.includes(song.id)}
          onToggle={(song) => lib.togglePlaylistSong(playlist.id, song.id)}
        />
      </section>
    </>
  );
}
