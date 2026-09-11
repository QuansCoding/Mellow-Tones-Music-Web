import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/authContext';
import { useCatalog } from '../components/catalog/catalogContext';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayer } from '../components/player/playerContext';
import { usePlayPlaylist, usePlaylistPlayback } from '../hooks/usePlayPlaylist';
import LibrarySection from '../components/library/LibrarySection';
import LibraryHero from '../components/library/LibraryHero';
import SignInPrompt from '../components/library/SignInPrompt';
import PlaylistCard from '../components/library/PlaylistCard';
import LikeButton from '../components/library/LikeButton';
import AddToPlaylistButton from '../components/library/AddToPlaylistButton';
import Picker from '../components/library/Picker';
import PlaylistDialog from '../components/library/PlaylistDialog';
import MediaCard from '../components/home/MediaCard';
import '../components/home/home.css';
import '../components/library/library.css';

export default function LibraryPage() {
  const navigate = useNavigate();
  const { isLoggedIn, ready } = useAuth();
  const { byId, error: catalogError } = useCatalog();
  const { playOrToggle, current, isPlaying } = usePlayer();
  const playPlaylist = usePlayPlaylist();
  const playbackOf = usePlaylistPlayback();
  const lib = useLibrary();

  // null | 'likes' | 'artists' | 'playlist'
  const [dialog, setDialog] = useState(null);

  const liked = lib.likes.map((id) => byId[id]).filter(Boolean);
  const playlists = lib.playlists;
  const favArtists = lib.artists;

  const dialogs = (
    <>
      <Picker
        open={dialog === 'likes'}
        onClose={() => setDialog(null)}
        title="Add to liked songs"
        kind="songs"
        placeholder="Search songs by title or artist"
        prompt="Start typing to find a song."
        countLabel={`${liked.length} liked ${liked.length === 1 ? 'song' : 'songs'}`}
        isSelected={(song) => lib.isLiked(song.id)}
        onToggle={(song) => lib.toggleLike(song.id)}
      />
      <Picker
        open={dialog === 'artists'}
        onClose={() => setDialog(null)}
        title="Choose favourite artists"
        kind="artists"
        placeholder="Search artists by name"
        prompt="Start typing to find an artist."
        countLabel={`${favArtists.length} favourite ${favArtists.length === 1 ? 'artist' : 'artists'}`}
        // /search returns artists as {id, name} — exactly the shape
        // toggleArtist wants, so no lookup back through the catalogue.
        isSelected={(artist) => lib.isFavoriteArtist(artist.id)}
        onToggle={(artist) => lib.toggleArtist(artist)}
      />
      <PlaylistDialog
        open={dialog === 'playlist'}
        onClose={() => setDialog(null)}
        onCreate={lib.createPlaylist}
      />
    </>
  );

  // Wait for /auth/me before deciding, so a reload does not flash the
  // signed-out prompt at someone who is signed in.
  if (!ready) return null;
  if (!isLoggedIn) return <SignInPrompt />;

  // Liked songs resolve through the catalogue, so without it they would
  // simply be missing — say why instead.
  const message =
    lib.error || (catalogError ? 'Couldn’t load songs from the server — retrying…' : '');
  const banner = message ? (
    <div className="error" role="alert">{message}</div>
  ) : null;

  // One return, with the body switched inside it. Two sibling returns put
  // {dialogs} at a different child index in each branch, so adding your first
  // liked song — which flips isEmpty — remounted the open dialog and wiped
  // whatever had been typed into it.
  return (
    <>
      {banner}

      {lib.isEmpty ? (
        <LibraryHero
          onAddSongs={() => setDialog('likes')}
          onNewPlaylist={() => setDialog('playlist')}
        />
      ) : (
        <>
        <LibrarySection
          title="Liked Songs"
          id="lib-liked"
          showAllTo="/library/liked"
          variant="album"
          count={liked.length}
          onAdd={() => setDialog('likes')}
          addLabel="Add liked songs"
        >
          {liked.map((s) => (
            <MediaCard
              key={s.id}
              variant="album"
              title={s.title}
              subtitle={s.artist}
              active={current?.id === s.id}
              onClick={() => playOrToggle(s, liked)}
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
        </LibrarySection>

        <LibrarySection
          title="Playlist"
          id="lib-playlists"
          showAllTo="/library/playlists"
          variant="artist"
          count={playlists.length}
          onAdd={() => setDialog('playlist')}
          addLabel="Create a playlist"
        >
          {playlists.map((p) => {
            const { playable, playing } = playbackOf(p);
            return (
              <PlaylistCard
                key={p.id}
                playlist={p}
                playable={playable}
                playing={playing}
                onPlay={() => playPlaylist(p)}
                onOpen={() =>
                  navigate(`/library/playlists/${p.id}`, {
                    state: { back: { to: '/library', label: 'Library' } },
                  })
                }
              />
            );
          })}
        </LibrarySection>

        <LibrarySection
          title="Favorite Artists"
          id="lib-artists"
          showAllTo="/library/artists"
          variant="album"
          count={favArtists.length}
          onAdd={() => setDialog('artists')}
          addLabel="Choose favourite artists"
          emptyMessage="You don’t have a favorite artist ..."
          emptyAction="Choose artists"
        >
          {favArtists.map((a) => (
            <MediaCard
              key={a.id}
              variant="album"
              title={a.name}
              onClick={() =>
                navigate(`/artists/${a.id}`, {
                  state: { back: { to: '/library', label: 'Library' } },
                })
              }
              actionLabel={`Open ${a.name}`}
              actions={<LikeButton artist={a} />}
            />
          ))}
        </LibrarySection>
        </>
      )}

      {dialogs}
    </>
  );
}
