import { useId, useState } from 'react';
import { useCatalogSearch } from '../../hooks/useCatalogSearch';
import { MapPin } from '../icons/Icons';

/**
 * Type-to-find list of catalogue rows, each a toggle that adds or removes.
 *
 * Shared by the library pickers (inside a dialog) and the playlist page's add
 * panel (inline), because both want exactly this: a search field, a page of
 * matches, and rows that commit immediately rather than through a save step.
 *
 * Nothing is fetched until something is typed. Showing the whole catalogue by
 * default was the original problem; a prompt is honest about the fact that
 * this is a find, not a browse.
 */
export default function SearchAddList({
  kind = 'songs',
  placeholder = 'Search songs by title or artist',
  prompt = 'Start typing to find a song.',
  isSelected,
  onToggle,
  autoFocus = false,
}) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const { results, loading, loadingMore, error, hasMore, loadMore } =
    useCatalogSearch(query, { kind });

  const term = query.trim();

  return (
    <div className="finder">
      <div className="finder__field">
        <span className="finder__icon" aria-hidden="true">
          <MapPin />
        </span>
        <label className="sr-only" htmlFor={inputId}>{placeholder}</label>
        <input
          id={inputId}
          className="finder__input"
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          // Modal focuses this after showModal(); see Modal.jsx.
          data-autofocus={autoFocus || undefined}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Results arriving is a visual change with no focus move, so announce
          it rather than leaving a screen reader waiting in silence. */}
      <p className="finder__status" role="status" aria-live="polite">
        {!term
          ? ''
          : loading
            ? 'Searching…'
            : error
              ? error
              : `${results.length}${hasMore ? '+' : ''} ${results.length === 1 ? 'match' : 'matches'}`}
      </p>

      {!term && <p className="finder__prompt">{prompt}</p>}

      {term && !loading && !error && results.length === 0 && (
        <p className="finder__prompt">No matches for “{term}”.</p>
      )}

      {results.length > 0 && (
        <ul className="picker__list">
          {results.map((item) => {
            const selected = isSelected(item);
            const primary = item.title ?? item.name;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`picker__row${selected ? ' picker__row--on' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onToggle(item)}
                >
                  <span className="picker__text">
                    <span className="picker__primary">{primary}</span>
                    {item.artist && (
                      <span className="picker__secondary">{item.artist}</span>
                    )}
                  </span>
                  <span className="picker__mark" aria-hidden="true">
                    {selected ? 'Added' : 'Add'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          className="finder__more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
