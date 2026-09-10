import { useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import { useLibrary } from './libraryContext';

/**
 * "Add <song> to…" — the contextual counterpart to the library pickers.
 *
 * The picker asks "which songs?" against a catalogue that can run to
 * thousands. This asks "which playlist?" against a handful of rows the user
 * created, so it lists them outright: search would be ceremony over a list of
 * four.
 *
 * Adding is the whole point of opening it, so creating a playlist here drops
 * the song straight in rather than leaving an empty playlist behind.
 */
export default function AddToPlaylistDialog({ open, onClose, song }) {
  const { playlists, togglePlaylistSong, addSongToPlaylist, createPlaylist } = useLibrary();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  // The field appears while the dialog is already open, so Modal's post-
  // showModal() focus has long since run; focus it here instead.
  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  async function submitNew(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const created = await createPlaylist(name);
    // addSongToPlaylist, not togglePlaylistSong: the toggle resolves the
    // playlist from state captured before this one existed, so it would
    // find nothing and quietly do nothing.
    if (created && song) addSongToPlaylist(created.id, song.id);
    setBusy(false);
    setName('');
    setCreating(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={song ? `Add “${song.title}” to…` : 'Add to playlist'}
    >
      {playlists.length === 0 && !creating && (
        <p className="finder__prompt">
          You don’t have any playlists yet. Create one to start.
        </p>
      )}

      {playlists.length > 0 && (
        <ul className="picker__list">
          {playlists.map((p) => {
            const inList = Boolean(song) && p.songIds.includes(song.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`picker__row${inList ? ' picker__row--on' : ''}`}
                  aria-pressed={inList}
                  disabled={!song}
                  onClick={() => togglePlaylistSong(p.id, song.id)}
                >
                  <span className="picker__text">
                    <span className="picker__primary">{p.name}</span>
                    <span className="picker__secondary">
                      {p.songIds.length} {p.songIds.length === 1 ? 'song' : 'songs'}
                    </span>
                  </span>
                  <span className="picker__mark" aria-hidden="true">
                    {inList ? 'Added' : 'Add'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <form className="finder__new" onSubmit={submitNew}>
          <label className="sr-only" htmlFor="new-playlist-name">Playlist name</label>
          <input
            id="new-playlist-name"
            ref={nameRef}
            className="finder__input"
            value={name}
            placeholder="Playlist name"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="finder__new-actions">
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create and add'}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => { setCreating(false); setName(''); }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="finder__more"
          onClick={() => setCreating(true)}
        >
          + New playlist
        </button>
      )}
    </Modal>
  );
}
