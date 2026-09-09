import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchSongs } from '../api';
import { useAuth } from '../components/auth/authContext';
import { useLibrary } from '../components/library/libraryContext';
import SignInPrompt from '../components/library/SignInPrompt';
import { usePlayer } from '../components/player/playerContext';
import Picker from '../components/library/Picker';
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
  const { query } = useOutletContext();
  const { isLoggedIn, ready } = useAuth();
  const { playSong, current } = usePlayer();
  const lib = useLibrary();

  const [songs, setSongs] = useState([]);
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

  const q = query.trim().toLowerCase();

  const items =
    kind === 'artists'
      ? lib.artists.filter((a) => !q || a.name.toLowerCase().includes(q))
      : kind === 'playlists'
        ? lib.playlists.filter((p) => !q || p.name.toLowerCase().includes(q))
        : lib.likes
            .map((id) => byId[id])
            .filter(Boolean)
            .filter(
              (s) =>
                !q ||
                s.title.toLowerCase().includes(q) ||
                s.artist.toLowerCase().includes(q),
            );

  const openPlaylist = lib.playlists.find((p) => p.id === dialog?.playlistId);

  const songItems = songs.map((s) => ({
    id: s.id,
    primary: s.title,
    secondary: s.artist,
  }));

  function renderTile(item) {
    if (kind === 'artists') {
      return <MediaCard key={item.id} variant="album" title={item.name} />;
    }
    if (kind === 'playlists') {
      return (
        <MediaCard
          key={item.id}
          variant="artist"
          title={item.name}
          subtitle={`${item.songIds.length} ${item.songIds.length === 1 ? 'song' : 'songs'}`}
          onClick={() => setDialog({ playlistId: item.id })}
          actionLabel={`Edit songs in ${item.name}`}
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
        onClick={() => playSong(item, items)}
        actionLabel={`Play ${item.title} by ${item.artist}`}
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

      <Picker
        open={Boolean(openPlaylist)}
        onClose={() => setDialog(null)}
        title={openPlaylist ? `Songs in “${openPlaylist.name}”` : ''}
        items={songItems}
        isSelected={(id) => Boolean(openPlaylist?.songIds.includes(id))}
        onToggle={(id) => lib.togglePlaylistSong(openPlaylist.id, id)}
        emptyNote="No songs in the catalogue yet."
      />
      <PlaylistDialog
        open={dialog === 'newPlaylist'}
        onClose={() => setDialog(null)}
        onCreate={lib.createPlaylist}
      />
    </>
  );
}
