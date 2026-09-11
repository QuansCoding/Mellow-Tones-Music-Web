import { usePlayer } from '../player/playerContext';
import Artwork from '../common/Artwork';
import { Play, Pause } from '../icons/Icons';
import { formatCount, formatPlays, formatTime } from '../../utils/format';
import AddToPlaylistButton from './AddToPlaylistButton';
import LikeButton from './LikeButton';

/**
 * Song rows for pages whose list is not yours to edit — an artist, or
 * someone else's playlist. Same anatomy as your own playlist's rows, with
 * add-to-playlist and like in place of Remove.
 *
 * `context` is passed to the player so plays are credited to the playlist
 * they were heard in.
 */
export default function SongRows({ songs, context }) {
  const { current, isPlaying, playOrToggle } = usePlayer();

  return (
    <ul className="plrows">
      {songs.map((song, i) => {
        const isCurrent = current?.id === song.id;
        const nowPlaying = isCurrent && isPlaying;
        return (
          <li key={song.id} className={`plrow${isCurrent ? ' plrow--current' : ''}`}>
            <button
              type="button"
              className="plrow__main"
              // Queue the whole list behind the row picked, so playing from
              // the middle still carries on to the end.
              onClick={() => playOrToggle(song, songs, context)}
              aria-label={nowPlaying ? `Pause ${song.title}` : `Play ${song.title} by ${song.artist}`}
            >
              <span className="plrow__index" aria-hidden="true">{i + 1}</span>
              <span className="plrow__icon" aria-hidden="true">
                {nowPlaying ? <Pause size={14} /> : <Play size={14} />}
              </span>
              <Artwork className="plrow__art" alt={`${song.title} cover art`} />
              <span className="plrow__text">
                <span className="plrow__title">{song.title}</span>
                <span className="plrow__artist">{song.artist}</span>
              </span>
              {song.play_count != null && (
                <span className="plrow__plays" title={formatPlays(song.play_count)}>
                  {formatCount(song.play_count)}
                </span>
              )}
              <span className="plrow__dur">{formatTime(song.duration_sec)}</span>
            </button>
            <div className="plrow__acts">
              <AddToPlaylistButton song={song} className="plrow__act" size={14} />
              <LikeButton song={song} className="plrow__act" size={14} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
