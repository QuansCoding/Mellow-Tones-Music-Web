import Artwork from '../common/Artwork';
import { Play, Plus } from '../icons/Icons';

/**
 * A playlist tile: clicking it plays the playlist, with the rest queued.
 *
 * Previously clicking opened the song editor, which made playlists the only
 * card in the app where a click did not play — and left no way to play one at
 * all. Editing moves to a secondary button revealed on hover and focus, the
 * same pattern the Trending rows already use for their rank/play swap.
 *
 * The Edit button is a real sibling button rather than a nested one: a button
 * inside a button is invalid HTML and browsers resolve it unpredictably.
 */
export default function PlaylistCard({ playlist, playable, onPlay, onEdit }) {
  const count = playlist.songIds.length;

  return (
    <li className="card card--artist card--playlist">
      <button
        type="button"
        className="card__button"
        onClick={onPlay}
        disabled={!playable}
        aria-label={
          playable
            ? `Play ${playlist.name}`
            : `${playlist.name} is empty — add songs to play it`
        }
      >
        <Artwork className="card__art" alt={`${playlist.name} cover art`} />
        <div className="card__info">
          <p className="card__title">{playlist.name}</p>
          <p className="card__subtitle">
            {count} {count === 1 ? 'song' : 'songs'}
          </p>
        </div>
        {playable && (
          <span className="card__play" aria-hidden="true">
            <Play size={16} />
          </span>
        )}
      </button>

      <button
        type="button"
        className="card__edit"
        onClick={onEdit}
        aria-label={`Edit songs in ${playlist.name}`}
      >
        <Plus size={14} />
      </button>
    </li>
  );
}
