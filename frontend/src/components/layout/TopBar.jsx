import Brand from './Brand';
import SearchBox from '../search/SearchBox';
import { Menu, Close } from '../icons/Icons';

/**
 * Sticky header. Owns the drawer toggle (below 1024px), a compact wordmark,
 * and the search combobox.
 *
 * Search state lives inside SearchBox now. It used to be lifted to AppShell
 * and pushed into every page so they could filter themselves — which is why
 * typing rewrote "Trending Today".
 */
export default function TopBar({ navOpen, onToggleNav, navId }) {
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

      <SearchBox />
    </header>
  );
}
