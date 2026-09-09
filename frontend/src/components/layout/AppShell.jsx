import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MiniPlayer from '../player/MiniPlayer';
import NowPlayingSheet from '../player/NowPlayingSheet';
import './layout.css';

const NAV_ID = 'primary-nav';

/**
 * App-shell layout: the chrome is pinned to the viewport edges and only the
 * content column scrolls, so the sidebar and search bar can never scroll away.
 */
export default function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();

  // A drawer that survives navigation feels broken, so close it on every move.
  // Adjusted during render rather than in an effect — React re-runs this
  // component immediately without committing the stale open state, so the
  // drawer never paints open on the new route.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setNavOpen(false);
  }

  // Escape closes the drawer — expected of anything modal-ish.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div className={`app${navOpen ? ' app--nav-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>

      <Sidebar
        id={NAV_ID}
        open={navOpen}
        onNavigate={() => setNavOpen(false)}
      />

      {/* Scrim sits under the drawer on small screens only. */}
      <div
        className="app__scrim"
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <div className="app__column">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          navOpen={navOpen}
          onToggleNav={() => setNavOpen((v) => !v)}
          navId={NAV_ID}
        />

        <main id="main-content" className="app__content">
          <Outlet context={{ query }} />
        </main>
      </div>

      <MiniPlayer />
      <NowPlayingSheet />
    </div>
  );
}
