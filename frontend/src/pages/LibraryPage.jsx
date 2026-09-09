import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchSongs } from '../api';
import { useAuth } from '../components/auth/authContext';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayer } from '../components/player/playerContext';
import LibrarySection from '../components/library/LibrarySection';
import LibraryHero from '../components/library/LibraryHero';
import SignInPrompt from '../components/library/SignInPrompt';
import Picker from '../components/library/Picker';
import PlaylistDialog from '../components/library/PlaylistDialog';
import MediaCard from '../components/home/MediaCard';
import '../components/home/home.css';
import '../components/library/library.css';

export default function LibraryPage() {
  const { query } = useOutletContext();
  const { isLoggedIn, ready } = useAuth();
  const { playSong, current } = usePlayer();
  const lib = useLibrary();

  const [songs, setSongs] = useState([]);
  // null | 'likes' | 'artists' | 'playlist' | { playlistId }
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchSongs()
      .then((res) => { if (!cancelled) setSongs(res.data); })
      .catch(() => { if (!cancelled) setSongs([]); });
    return () => { cancelled = true; };
  }, []);

  const byId = useMemo(
    () => Object.fromEntries(songs.map((s) => [s.id, s])),
    [songs],
  );

  /** Artists are rows now, so the catalogue yields {id, name} pairs and
   *  favourites are keyed by id rather than by a spelling of the name. */
  const allArtists = useMemo(() => {
    const seen = new Map();
    for (const s of songs) {
      if (!seen.has(s.artist_id)) seen.set(s.artist_id, { id: s.artist_id, name: s.artist });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  const q = query.trim().toLowerCase();
  const matchSong = (s) =>
    !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);

  const liked = lib.likes.map((id) => byId[id]).filter(Boolean);
  const playlists = lib.playlists;
  const favArtists = lib.artists;

  const shown = {
    liked: liked.filter(matchSong),
    playlists: playlists.filter((p) => !q || p.name.toLowerCase().includes(q)),
    artists: favArtists.filter((a) => !q || a.name.toLowerCase().includes(q)),
  };

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
        // toggleArtist needs the whole artist so it can show the name without
        // a second lookup after an optimistic add.
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

      {/* Liked Songs is the primary section: the merged home for every song
          you keep, and what the heart on the home page writes into. */}
      <LibrarySection
        title="Liked Songs"
        id="lib-liked"
        showAllTo="/library/liked"
        variant="album"
        count={shown.liked.length}
        total={liked.length}
        query={query}
        onAdd={() => setDialog('likes')}
        addLabel="Add liked songs"
      >
        {shown.liked.map((s) => (
          <MediaCard
            key={s.id}
            variant="album"
            title={s.title}
            subtitle={s.artist}
            active={current?.id === s.id}
            onClick={() => playSong(s, shown.liked)}
            actionLabel={`Play ${s.title} by ${s.artist}`}
          />
        ))}
      </LibrarySection>

      <LibrarySection
        title="Playlist"
        id="lib-playlists"
        showAllTo="/library/playlists"
        variant="artist"
        count={shown.playlists.length}
        total={playlists.length}
        query={query}
        onAdd={() => setDialog('playlist')}
        addLabel="Create a playlist"
      >
        {shown.playlists.map((p) => (
          <MediaCard
            key={p.id}
            variant="artist"
            title={p.name}
            subtitle={`${p.songIds.length} ${p.songIds.length === 1 ? 'song' : 'songs'}`}
            onClick={() => setDialog({ playlistId: p.id })}
            actionLabel={`Edit songs in ${p.name}`}
          />
        ))}
      </LibrarySection>

      <LibrarySection
        title="Favorite Artists"
        id="lib-artists"
        showAllTo="/library/artists"
        variant="album"
        count={shown.artists.length}
        total={favArtists.length}
        query={query}
        onAdd={() => setDialog('artists')}
        addLabel="Choose favourite artists"
        emptyMessage="You don’t have a favorite artist ..."
        emptyAction="Choose artists"
      >
        {shown.artists.map((a) => (
          <MediaCard key={a.id} variant="album" title={a.name} />
        ))}
      </LibrarySection>

      {dialogs}
    </>
  );
}
