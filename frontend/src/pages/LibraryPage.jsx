import { useMemo, useState } from 'react';
import { useAuth } from '../components/auth/authContext';
import { useCatalog } from '../components/catalog/catalogContext';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayer } from '../components/player/playerContext';
import { usePlayPlaylist } from '../hooks/usePlayPlaylist';
import LibrarySection from '../components/library/LibrarySection';
import LibraryHero from '../components/library/LibraryHero';
import SignInPrompt from '../components/library/SignInPrompt';
import PlaylistCard from '../components/library/PlaylistCard';
import Picker from '../components/library/Picker';
import PlaylistDialog from '../components/library/PlaylistDialog';
import MediaCard from '../components/home/MediaCard';
import '../components/home/home.css';
import '../components/library/library.css';

export default function LibraryPage() {
  const { isLoggedIn, ready } = useAuth();
  const { songs, byId, resolve } = useCatalog();
  const { playSong, current } = usePlayer();
  const playPlaylist = usePlayPlaylist();
  const lib = useLibrary();

  // null | 'likes' | 'artists' | 'playlist' | { playlistId }
  const [dialog, setDialog] = useState(null);

  /** Artists are rows now, so the catalogue yields {id, name} pairs and
   *  favourites are keyed by id rather than by a spelling of the name. */
  const allArtists = useMemo(() => {
    const seen = new Map();
    for (const s of songs) {
      if (!seen.has(s.artist_id)) seen.set(s.artist_id, { id: s.artist_id, name: s.artist });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  const liked = lib.likes.map((id) => byId[id]).filter(Boolean);
  const playlists = lib.playlists;
  const favArtists = lib.artists;

  const openPlaylist = playlists.find((p) => p.id === dialog?.playlistId);

  const songItems = songs.map((s) => ({
    id: s.id,
    primary: s.title,
    secondary: s.artist,
  }));

  const artistItems = allArtists.map((a) => ({ id: a.id, primary: a.name }));

  const noSongsNote =
    'No songs in the catalogue yet. Upload one from Create → Upload Song.';

  const dialogs = (
    <>
      <Picker
        open={dialog === 'likes'}
        onClose={() => setDialog(null)}
        title="Add to liked songs"
        items={songItems}
        isSelected={lib.isLiked}
        onToggle={lib.toggleLike}
        emptyNote={noSongsNote}
      />
      <Picker
        open={dialog === 'artists'}
        onClose={() => setDialog(null)}
        title="Choose favourite artists"
        items={artistItems}
        isSelected={lib.isFavoriteArtist}
        onToggle={(id) => lib.toggleArtist(allArtists.find((a) => a.id === id))}
        emptyNote={noSongsNote}
      />
      <Picker
        open={Boolean(openPlaylist)}
        onClose={() => setDialog(null)}
        title={openPlaylist ? `Songs in “${openPlaylist.name}”` : ''}
        items={songItems}
        isSelected={(id) => Boolean(openPlaylist?.songIds.includes(id))}
        onToggle={(id) => lib.togglePlaylistSong(openPlaylist.id, id)}
        emptyNote={noSongsNote}
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

  const banner = lib.error ? (
    <div className="error" role="alert">{lib.error}</div>
  ) : null;

  if (lib.isEmpty) {
    return (
      <>
        {banner}
        <LibraryHero
          onAddSongs={() => setDialog('likes')}
          onNewPlaylist={() => setDialog('playlist')}
        />
        {dialogs}
      </>
    );
  }

  return (
    <>
      {banner}

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
            onClick={() => playSong(s, liked)}
            actionLabel={`Play ${s.title} by ${s.artist}`}
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
        {playlists.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={p}
            playable={resolve(p.songIds).length > 0}
            onPlay={() => playPlaylist(p)}
            onEdit={() => setDialog({ playlistId: p.id })}
          />
        ))}
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
          <MediaCard key={a.id} variant="album" title={a.name} />
        ))}
      </LibrarySection>

      {dialogs}
    </>
  );
}
