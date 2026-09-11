import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { fetchPublicPlaylist } from '../api';
import { useCatalog } from '../components/catalog/catalogContext';
import { useLibrary } from '../components/library/libraryContext';
import { usePlayPlaylist, usePlaylistPlayback } from '../hooks/usePlayPlaylist';
import SongRows from '../components/library/SongRows';
import { ChevronLeft } from '../components/icons/Icons';
import { formatPlays, formatTime } from '../utils/format';
import '../components/home/home.css';
import '../components/library/library.css';

/**
 * Someone else's public playlist, read-only.
 *
 * Opened from Home or a shared link. The owner is shown by username only.
 * If it turns out to be yours, you are sent to your own editable page
 * instead of a read-only copy of it.
 */
export default function PublicPlaylistPage() {
  const { playlistId } = useParams();
  const location = useLocation();
  const back = location.state?.back ?? { to: '/', label: 'Home' };
  const { resolve } = useCatalog();
  const lib = useLibrary();
  const playPlaylist = usePlayPlaylist();
  const playbackOf = usePlaylistPlayback();

  const [result, setResult] = useState({ id: null, playlist: null, status: null });

  useEffect(() => {
    let cancelled = false;
    fetchPublicPlaylist(playlistId)
      .then(({ data }) => {
        if (!cancelled) setResult({ id: playlistId, playlist: data, status: 'ok' });
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status === 404 ? 'missing' : 'error';
        setResult({ id: playlistId, playlist: null, status });
      });
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  if (lib.playlists.some((p) => p.id === playlistId)) {
    return (
      <Navigate to={`/library/playlists/${playlistId}`} replace state={location.state} />
    );
  }

  const backLink = (
    <Link className="plhead__back" to={back.to}>
      <ChevronLeft size={16} />
      {back.label}
    </Link>
  );

  if (result.id !== playlistId) return null;

  if (result.status !== 'ok') {
    return (
      <section className="stub">
        {backLink}
        <h1 className="stub__title">
          {result.status === 'missing' ? 'Playlist not found' : 'Couldn’t load this playlist'}
        </h1>
        <p className="stub__blurb">
          {result.status === 'missing'
            ? 'It may have been made private or deleted.'
            : 'The server didn’t respond. Try again in a moment.'}
        </p>
      </section>
    );
  }

  const { playlist } = result;
  const songs = resolve(playlist.song_ids);
  const totalSec = songs.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0);
  const { playing } = playbackOf(playlist);

  return (
    <>
      <header className="plhead">
        {backLink}
        <p className="plhead__eyebrow">Public playlist</p>
        <h1 className="plhead__title">{playlist.name}</h1>
        <p className="plhead__meta">
          by {playlist.owner} · {songs.length} {songs.length === 1 ? 'song' : 'songs'}
          {songs.length > 0 && ` · ${formatTime(totalSec)}`} · {formatPlays(playlist.play_count)}
        </p>

        <div className="plhead__actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => playPlaylist(playlist)}
            disabled={songs.length === 0}
          >
            {playing ? '❚❚ Pause' : '▶ Play all'}
          </button>
        </div>
      </header>

      <section className="section" aria-labelledby="pub-songs">
        <h2 className="section__title" id="pub-songs">Songs</h2>
        {songs.length > 0 ? (
          <SongRows songs={songs} context={{ playlistId: playlist.id }} />
        ) : (
          <p className="section__note">This playlist is empty.</p>
        )}
      </section>
    </>
  );
}
