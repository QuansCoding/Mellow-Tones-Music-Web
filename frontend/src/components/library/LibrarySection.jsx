import SectionHeader from '../home/SectionHeader';
import AddCard from './AddCard';

/**
 * One Library section.
 *
 * Two empty-state grammars, following the Figma's own distinction:
 *
 *  - Sections you fill directly (Liked Songs, Playlists) show a bare "+" tile.
 *    The affordance explains itself, so no copy is needed — this is what the
 *    Figma draws for its add tiles.
 *  - Favourite Artists shows a sentence instead, because a lone "+" there
 *    would imply you can invent an artist. The Figma's version dead-ends on
 *    that sentence; this one carries an action so the user can get out of the
 *    empty state.
 */
export default function LibrarySection({
  title,
  id,
  showAllTo,
  variant,
  count,
  total,
  query,
  onAdd,
  addLabel,
  emptyMessage,
  emptyAction,
  children,
}) {
  const gridClass = variant === 'artist' ? 'grid--fill-wide' : 'grid--fill';

  // "You own nothing" and "your search excluded everything" are different
  // states and must not look the same — otherwise a filter reads as data loss.
  const genuinelyEmpty = total === 0;
  const filteredOut = total > 0 && count === 0;

  return (
    <section className="section" aria-labelledby={id}>
      <SectionHeader title={title} id={id} showAllTo={total > 0 ? showAllTo : undefined} />

      {filteredOut && (
        <p className="section__note">No matches in {title.toLowerCase()} for “{query}”.</p>
      )}

      {!filteredOut && genuinelyEmpty && emptyMessage && (
        <div className="empty">
          <p className="empty__message">{emptyMessage}</p>
          {emptyAction && (
            <button type="button" className="button button-primary" onClick={onAdd}>
              {emptyAction}
            </button>
          )}
        </div>
      )}

      {!filteredOut && !(genuinelyEmpty && emptyMessage) && (
        <ul className={`grid ${gridClass}`}>
          <AddCard variant={variant} label={addLabel} onClick={onAdd} />
          {children}
        </ul>
      )}
    </section>
  );
}
