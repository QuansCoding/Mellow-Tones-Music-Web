import { Link } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import Brand from './Brand';
import Nav from './Nav';
import AboutSong from './AboutSong';
import SidebarPlayer from '../player/SidebarPlayer';

/**
 * Fixed rail above 1024px; off-canvas drawer below it.
 *
 * The player renders inside the rail but is hidden by CSS on small screens,
 * where MiniPlayer takes over at the bottom edge — so the drawer stays short
 * instead of stacking ~600px of chrome above the content.
 */
export default function Sidebar({ id, open, onNavigate }) {
  const { isLoggedIn } = useAuth();
  return (
    <aside
      id={id}
      className={`sidebar${open ? ' sidebar--open' : ''}`}
      // The drawer is inert to assistive tech while closed on small screens.
      aria-hidden={undefined}
    >
      <div className="sidebar__inner">
        <Brand className="brand--sidebar" />

        <Nav onNavigate={onNavigate} />

        <AboutSong />

        <SidebarPlayer />

        {/* Back in normal flow, pushed down by `margin-top: auto`. Pinning it
            outside the scroll region meant the player slid underneath it,
            which read as a floating button overlapping the card. */}
        <Link
          to={isLoggedIn ? '/settings' : '/login'}
          className="sidebar__account"
          onClick={onNavigate}
        >
          {isLoggedIn ? 'Settings' : 'Sign-in'}
        </Link>
      </div>
    </aside>
  );
}
