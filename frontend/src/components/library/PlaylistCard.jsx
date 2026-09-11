import Artwork from '../common/Artwork';
import { Play, Pause } from '../icons/Icons';

/**
 * A playlist tile: clicking it opens the playlist's page, with a play button
 * over the artwork.
 *
 * This reverses an earlier call, and the reason it should. Clicking used to
 * open a song-picker modal, so playback was made the click target — at the
 * time there was nothing better for a click to do. Now that a playlist has a
 * page, the rule that holds across the app is by object type: a song tile
 * plays, a container tile opens. The play button keeps starting it in one
 * click from the grid.
 *
 * It is a real sibling button, not nested inside the card's button: a button
 * inside a button is invalid HTML and browsers resolve it unpredictably. The
 * card's :focus-within reveals it, so it is reachable by keyboard, and it
 * stays visible while this playlist is the one playing.
 */
export default function PlaylistCard({
  playlist, playable, playing, onPlay, onOpen, variant = 'artist', subtitle,
}) {
  const count = playlist.songIds.length;

  return (
    <li className={`card card--${variant} card--playlist${playing ? ' card--active' : ''}`}>
      <button
        type="button"
        className="card__button"
        onClick={onOpen}
        aria-label={`Open ${playlist.name}`}
      >
        <Artwork className="card__art" alt={`${playlist.name} cover art`} />
        <div className="card__info">
          <p className="card__title">{playlist.name}</p>
          <p className="card__subtitle">
            {subtitle ?? `${count} ${count === 1 ? 'song' : 'songs'}`}
          </p>
        </div>
      </button>

      <button
        type="button"
        className="card__play"
        onClick={onPlay}
        disabled={!playable}
        aria-label={
          !playable
            ? `${playlist.name} is empty — add songs to play it`
            : playing
              ? `Pause ${playlist.name}`
              : `Play ${playlist.name}`
        }
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </li>
  );
}
