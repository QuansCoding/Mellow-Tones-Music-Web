import Brand from './Brand';
import { MapPin, Menu, Close } from '../icons/Icons';

/**
 * Sticky header. Owns the search field, the avatar, and — below 1024px — the
 * drawer toggle and a compact wordmark.
 */
export default function TopBar({
  query,
  onQueryChange,
  navOpen,
  onToggleNav,
  navId,
}) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__menu"
        aria-expanded={navOpen}
        aria-controls={navId}
        aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={onToggleNav}
      >
        {navOpen ? <Close /> : <Menu />}
      </button>

      <Brand className="brand--topbar" />

      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <span className="search__icon">
          <MapPin />
        </span>
        <label className="sr-only" htmlFor="site-search">
          Search for song name or artist
        </label>
        <input
          id="site-search"
          className="search__input"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search for song name or artist ..."
        />
      </form>
    </header>
  );
}
