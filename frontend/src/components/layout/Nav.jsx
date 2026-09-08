import { NavLink } from 'react-router-dom';

/**
 * Primary navigation. Section rows and their sub-rows are the Figma's own
 * hierarchy; NavLink supplies the current-page state the mockup lacks.
 */
const SECTIONS = [
  { label: 'Home', to: '/', end: true },
  { label: 'Discover', to: '/discover' },
  {
    label: 'Library',
    to: '/library',
    end: true,
    // Mirrors the three Library sections exactly. Downloads folded into Liked
    // Songs, so its nav slot goes to the surviving section and Playlist takes
    // the one Liked Songs vacated.
    children: [
      { label: 'Liked Songs', to: '/library/liked' },
      { label: 'Playlist', to: '/library/playlists' },
      { label: 'Favorite Artist', to: '/library/artists' },
    ],
  },
  {
    label: 'Create',
    to: '/create',
    end: true,
    children: [
      { label: 'Manage Songs', to: '/create/manage' },
      { label: 'Upload Song', to: '/create/upload' },
    ],
  },
];

function linkClass(modifier) {
  return ({ isActive }) =>
    `nav__link nav__link--${modifier}${isActive ? ' nav__link--current' : ''}`;
}

export default function Nav({ onNavigate }) {
  return (
    <nav className="nav" aria-label="Primary">
      <ul className="nav__list">
        {SECTIONS.map((section) => (
          <li key={section.to} className="nav__group">
            <NavLink
              to={section.to}
              end={section.end}
              className={linkClass('section')}
              onClick={onNavigate}
            >
              {section.label}
            </NavLink>

            {section.children && (
              <ul className="nav__sublist">
                {section.children.map((child) => (
                  <li key={child.to}>
                    <NavLink
                      to={child.to}
                      className={linkClass('sub')}
                      onClick={onNavigate}
                    >
                      {child.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
