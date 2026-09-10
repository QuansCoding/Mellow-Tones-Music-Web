import Artwork from '../common/Artwork';

/**
 * Album and artist tiles. Same anatomy — art with an overlaid label block —
 * differing only in aspect ratio and whether a subtitle is present, so they
 * share one component rather than duplicating the markup.
 *
 * Aspect ratios come straight from the Figma (137x125 and 200x125) and are
 * expressed as `aspect-ratio`, so the tiles grow with the window instead of
 * stretching out of proportion.
 *
 * Passing `onClick` turns the whole tile into one button rather than adding a
 * separate hit target, which keeps the label and the artwork a single thing to
 * a screen reader and to a pointer.
 *
 * `actions` overlays secondary controls — a like heart, add-to-playlist — as
 * *siblings* of that button, never inside it: a button nested in a button is
 * invalid HTML and browsers resolve it unpredictably. Same arrangement the
 * playlist tile uses for its play button.
 */
export default function MediaCard({
  variant,
  title,
  subtitle,
  artSrc,
  onClick,
  actionLabel,
  actions,
  active = false,
}) {
  const body = (
    <>
      <Artwork className="card__art" src={artSrc} alt={`${title} cover art`} />
      <div className="card__info">
        <p className="card__title">{title}</p>
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </div>
    </>
  );

  return (
    <li className={`card card--${variant}${active ? ' card--active' : ''}`}>
      {onClick ? (
        <button
          type="button"
          className="card__button"
          onClick={onClick}
          aria-label={actionLabel}
        >
          {body}
        </button>
      ) : (
        body
      )}
      {actions && <div className="card__actions">{actions}</div>}
    </li>
  );
}
