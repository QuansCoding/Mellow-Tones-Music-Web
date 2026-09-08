import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchSongs } from '../api';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayer } from '../components/player/playerContext';
import LibrarySection from '../components/library/LibrarySection';
import LibraryHero from '../components/library/LibraryHero';
import Picker from '../components/library/Picker';
import PlaylistDialog from '../components/library/PlaylistDialog';
import MediaCard from '../components/home/MediaCard';
import '../components/home/home.css';
import '../components/library/library.css';

export default function LibraryPage() {
  const { query } = useOutletContext();
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

  /** Every distinct artist in the catalogue — the only real artist data there is. */
  const allArtists = useMemo(
    () => [...new Set(songs.map((s) => s.artist))].sort(),
    [songs],
  );

  const q = query.trim().toLowerCase();
  const matchSong = (s) =>
    !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);

  const liked = lib.likes.map((id) => byId[id]).filter(Boolean);
  const playlists = lib.playlists;
  const favArtists = lib.artists;

  const shown = {
    liked: liked.filter(matchSong),
    playlists: playlists.filter((p) => !q || p.name.toLowerCase().includes(q)),
    artists: favArtists.filter((a) => !q || a.toLowerCase().includes(q)),
  };

  const openPlaylist = playlists.find((p) => p.id === dialog?.playlistId);

  const songItems = songs.map((s) => ({
    id: s.id,
    primary: s.title,
    secondary: s.artist,
  }));

  const artistItems = allArtists.map((a) => ({ id: a, primary: a }));

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
        onToggle={lib.toggleArtist}
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

  if (lib.isEmpty) {
    return (
      <>
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
          <MediaCard key={a} variant="album" title={a} />
        ))}
      </LibrarySection>

      {dialogs}
    </>
  );
}
