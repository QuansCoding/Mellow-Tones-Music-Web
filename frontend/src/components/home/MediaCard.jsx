import Artwork from '../common/Artwork';

/**
 * Album and artist tiles. Same anatomy — art with an overlaid label block —
 * differing only in aspect ratio and whether a subtitle is present, so they
 * share one component rather than duplicating the markup.
 *
 * Aspect ratios come straight from the Figma (137x125 and 200x125) and are
 * expressed as `aspect-ratio`, so the tiles grow with the window instead of
 * stretching out of proportion.
 */
export default function MediaCard({ variant, title, subtitle, artSrc }) {
  return (
    <li className={`card card--${variant}`}>
      <Artwork className="card__art" src={artSrc} alt={`${title} cover art`} />
      <div className="card__info">
        <p className="card__title">{title}</p>
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </div>
    </li>
  );
}
