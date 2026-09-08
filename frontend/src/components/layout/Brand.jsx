import { Link } from 'react-router-dom';

/**
 * The wordmark. The three rotated "Z" glyphs are the Figma's logo mark —
 * they are literal rotated text nodes in the source file, not a vector.
 */
export default function Brand({ className = '' }) {
  return (
    <Link to="/" className={`brand ${className}`} aria-label="MellowTones — home">
      <span className="brand__mark" aria-hidden="true">
        <span className="brand__z brand__z--3">Z</span>
        <span className="brand__z brand__z--1">Z</span>
        <span className="brand__z brand__z--2">Z</span>
      </span>
      <span className="brand__name">MellowTones</span>
    </Link>
  );
}
