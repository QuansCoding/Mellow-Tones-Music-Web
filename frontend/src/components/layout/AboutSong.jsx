import { usePlayer } from '../player/playerContext';
import { formatTime } from '../../utils/format';
import { ChevronDown } from '../icons/Icons';

/**
 * The Figma's "About The Song" panel, as progressive disclosure.
 *
 * Its three facts — title, artist, length — are already on the player card
 * directly below it, so rendering both expanded permanently duplicated the
 * same data and pushed the rail past one screen. Collapsed by default it
 * costs ~28px instead of ~118px, and it stays the natural home for the
 * richer detail (album, year, credits) this panel is presumably for.
 *
 * <details> gives keyboard support and the open/close state for free.
 */
export default function AboutSong() {
  const { current, duration } = usePlayer();

  return (
    <details className="about">
      <summary className="about__title">
        <span>About The Song</span>
        <span className="about__chevron" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </summary>

      <div className="about__body">
        {current ? (
          <dl className="about__facts">
            <div className="about__fact">
              <dt>Title</dt>
              <dd>{current.title}</dd>
            </div>
            <div className="about__fact">
              <dt>Artist</dt>
              <dd>{current.artist}</dd>
            </div>
            <div className="about__fact">
              <dt>Length</dt>
              <dd>{formatTime(duration || current.duration_sec)}</dd>
            </div>
          </dl>
        ) : (
          <p className="about__text">Details about the song ...</p>
        )}
      </div>
    </details>
  );
}
