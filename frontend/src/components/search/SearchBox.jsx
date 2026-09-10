import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAll } from '../../api';
import { usePlayer } from '../player/playerContext';
import { usePlayPlaylist } from '../../hooks/usePlayPlaylist';
import { MapPin, Play, Heart, Menu } from '../icons/Icons';
import './search.css';

const DEBOUNCE_MS = 180;
const PER_GROUP = 5;
const EMPTY_RESULTS = { songs: [], artists: [], playlists: [] };

/**
 * Search combobox with a grouped results dropdown.
 *
 * Implemented as a real WAI-ARIA combobox rather than an input with a div
 * under it: role/aria-expanded/aria-activedescendant plus arrow-key handling,
 * so the list is operable without a mouse. A custom dropdown that only
 * responds to clicks is the most common accessibility failure in this pattern.
 *
 * Keyboard navigation runs over one flattened list even though the results are
 * visually grouped — pressing Down should walk from the last song into the
 * first artist, not stop at a heading.
 */
export default function SearchBox() {
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const playPlaylist = usePlayPlaylist();

  const listboxId = useId();
  const optionId = (i) => `${listboxId}-opt-${i}`;

  const [query, setQuery] = useState('');
  const [fetched, setFetched] = useState(EMPTY_RESULTS);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = query.trim();
  // Derived rather than stored: an empty box shows nothing without having to
  // write that emptiness into state from inside an effect.
  const results = term ? fetched : EMPTY_RESULTS;

  const rootRef = useRef(null);
  const inputRef = useRef(null);

  /* --- Fetch, debounced ------------------------------------------------- */
  useEffect(() => {
    if (!term) return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      searchAll(term, PER_GROUP)
        .then(({ data }) => {
          if (cancelled) return;
          setFetched(data);
          setActive(-1);
        })
        .catch(() => {
          if (!cancelled) setFetched(EMPTY_RESULTS);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  /* --- Close on outside click ------------------------------------------- */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  /* --- Flatten for keyboard navigation ---------------------------------- */
  const groups = [
    { key: 'songs', label: 'Songs', items: results.songs },
    { key: 'artists', label: 'Artists', items: results.artists },
    { key: 'playlists', label: 'Playlists', items: results.playlists },
  ].filter((g) => g.items.length > 0);

  const flat = [];
  for (const g of groups) for (const item of g.items) flat.push({ type: g.key, item });
  const hasSeeAll = Boolean(term);
  if (hasSeeAll) flat.push({ type: 'all', item: null });

  const showList = open && term.length > 0;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const choose = useCallback(
    (entry) => {
      if (!entry) return;
      close();

      if (entry.type === 'songs') {
        // Queue the whole result set, so playing the top hit lets you keep
        // going through the rest of what you searched for.
        playSong(entry.item, results.songs);
      } else if (entry.type === 'artists') {
        // Artists have no page of their own yet; the honest destination is
        // the full results for that artist's name.
        navigate(`/search?q=${encodeURIComponent(entry.item.name)}`);
        setQuery(entry.item.name);
      } else if (entry.type === 'playlists') {
        if (!playPlaylist(entry.item)) navigate('/library');
      } else {
        navigate(`/search?q=${encodeURIComponent(term)}`);
      }
    },
    [close, navigate, playPlaylist, playSong, results.songs, term],
  );

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!showList || flat.length === 0) {
      if (e.key === 'Enter' && term) {
        e.preventDefault();
        close();
        navigate(`/search?q=${encodeURIComponent(term)}`);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter with nothing highlighted means "show me everything".
      choose(active >= 0 ? flat[active] : { type: 'all', item: null });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(flat.length - 1);
    }
  }

  let cursor = -1;

  return (
    <div className="search" ref={rootRef}>
      <form
        className="search__field"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (term) {
            close();
            navigate(`/search?q=${encodeURIComponent(term)}`);
          }
        }}
      >
        <span className="search__icon">
          <MapPin />
        </span>
        <label className="sr-only" htmlFor="site-search">
          Search for song name or artist
        </label>
        <input
          id="site-search"
          ref={inputRef}
          className="search__input"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search for song name or artist ..."
        />
      </form>

      <div
        className={`search__panel${showList ? ' search__panel--open' : ''}`}
        // Present even when closed so aria-controls always resolves.
        hidden={!showList}
      >
        <ul className="search__listbox" id={listboxId} role="listbox" aria-label="Search results">
          {groups.map((group) => (
            <li key={group.key} role="presentation">
              <p className="search__group" id={`${listboxId}-${group.key}`} role="presentation">
                {group.label}
              </p>
              <ul className="search__group-list" role="group" aria-labelledby={`${listboxId}-${group.key}`}>
                {group.items.map((item) => {
                  cursor += 1;
                  const i = cursor;
                  return (
                    <li
                      key={`${group.key}-${item.id}`}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === active}
                      className={`search__option${i === active ? ' search__option--active' : ''}`}
                      // mousedown, not click: click fires after blur, which
                      // would close the panel before the choice registers.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        choose({ type: group.key, item });
                      }}
                      onMouseEnter={() => setActive(i)}
                    >
                      <span className="search__option-icon" aria-hidden="true">
                        {group.key === 'songs' && <Play size={13} />}
                        {group.key === 'artists' && <Heart size={13} />}
                        {group.key === 'playlists' && <Menu size={13} />}
                      </span>
                      <span className="search__option-text">
                        <span className="search__option-primary">
                          {group.key === 'songs' ? item.title : item.name}
                        </span>
                        <span className="search__option-secondary">
                          {group.key === 'songs' && item.artist}
                          {group.key === 'artists' && 'Artist'}
                          {group.key === 'playlists' &&
                            `${item.song_ids.length} ${item.song_ids.length === 1 ? 'song' : 'songs'}`}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}

          {groups.length === 0 && term && (
            <li className="search__empty" role="presentation">
              No matches for “{term}”.
            </li>
          )}

          {hasSeeAll && (() => {
            cursor += 1;
            const i = cursor;
            return (
              <li
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={`search__option search__option--all${i === active ? ' search__option--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose({ type: 'all', item: null });
                }}
                onMouseEnter={() => setActive(i)}
              >
                See all results for “{term}”
              </li>
            );
          })()}
        </ul>
      </div>
    </div>
  );
}
