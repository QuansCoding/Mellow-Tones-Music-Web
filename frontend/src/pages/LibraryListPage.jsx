import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/authContext';
import { useLibrary } from '../components/library/libraryContext';
import SignInPrompt from '../components/library/SignInPrompt';
import { usePlayer } from '../components/player/playerContext';
import { useCatalog } from '../components/catalog/catalogContext';
import { usePlayPlaylist, usePlaylistPlayback } from '../hooks/usePlayPlaylist';
import PlaylistCard from '../components/library/PlaylistCard';
import LikeButton from '../components/library/LikeButton';
import AddToPlaylistButton from '../components/library/AddToPlaylistButton';
import PlaylistDialog from '../components/library/PlaylistDialog';
import MediaCard from '../components/home/MediaCard';
import '../components/home/home.css';
import '../components/library/library.css';

const KINDS = {
  liked: { title: 'Liked Songs', variant: 'album' },
  playlists: { title: 'Playlist', variant: 'artist' },
  artists: { title: 'Favorite Artists', variant: 'album' },
};

/** The destination behind each section's "Show All" — the same tiles, uncapped. */
export default function LibraryListPage({ kind }) {
  const config = KINDS[kind];
  const navigate = useNavigate();
  const { isLoggedIn, ready } = useAuth();
  const { playOrToggle, current, isPlaying } = usePlayer();
  const { byId } = useCatalog();
  const playPlaylist = usePlayPlaylist();
  const playbackOf = usePlaylistPlayback();
  const lib = useLibrary();

  const [dialog, setDialog] = useState(null);

  const items =
    kind === 'artists'
      ? lib.artists
      : kind === 'playlists'
        ? lib.playlists
        : lib.likes.map((id) => byId[id]).filter(Boolean);

  function renderTile(item) {
    if (kind === 'artists') {
      return (
        <MediaCard
          key={item.id}
          variant="album"
          title={item.name}
          onClick={() =>
            navigate(`/artists/${item.id}`, {
              state: { back: { to: '/library/artists', label: 'Favorite Artists' } },
            })
          }
          actionLabel={`Open ${item.name}`}
          actions={<LikeButton artist={item} />}
        />
      );
    }
    if (kind === 'playlists') {
      const { playable, playing } = playbackOf(item);
      return (
        <PlaylistCard
          key={item.id}
          playlist={item}
          playable={playable}
          playing={playing}
          onPlay={() => playPlaylist(item)}
          onOpen={() =>
            navigate(`/library/playlists/${item.id}`, {
              state: { back: { to: '/library/playlists', label: 'Playlists' } },
            })
          }
        />
      );
    }
    return (
      <MediaCard
        key={item.id}
        variant="album"
        title={item.title}
        subtitle={item.artist}
        active={current?.id === item.id}
        onClick={() => playOrToggle(item, items)}
        actionLabel={
          current?.id === item.id && isPlaying
            ? `Pause ${item.title}`
            : `Play ${item.title} by ${item.artist}`
        }
        actions={
          <>
            <AddToPlaylistButton song={item} />
            <LikeButton song={item} />
          </>
        }
      />
    );
  }

  if (!ready) return null;
  if (!isLoggedIn) return <SignInPrompt what={config.title.toLowerCase()} />;

  return (
    <>
      <section className="section" aria-labelledby="list-title">
        <header className="section__head">
          <h1 className="section__title" id="list-title">{config.title}</h1>
          <Link className="section__link" to="/library">Back to library</Link>
        </header>

        {items.length === 0 ? (
          <p className="section__note">
            Nothing here yet. Add some from{' '}
            <Link className="linkish" to="/library">your library</Link>.
          </p>
        ) : (
          <ul
            className={`grid ${config.variant === 'artist' ? 'grid--fill-wide' : 'grid--fill'}`}
          >
            {items.map(renderTile)}
          </ul>
        )}
      </section>

      <PlaylistDialog
        open={dialog === 'newPlaylist'}
        onClose={() => setDialog(null)}
        onCreate={lib.createPlaylist}
      />
    </>
  );
}
