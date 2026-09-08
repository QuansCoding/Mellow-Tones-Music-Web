import { Plus } from '../icons/Icons';

/**
 * The Figma's "+" tile. Shares MediaCard's geometry so it sits in the same
 * grid track, and persists as the first item once a section has content —
 * adding stays one click from where the content lives.
 */
export default function AddCard({ variant, label, onClick }) {
  return (
    <li className={`card card--${variant} card--add`}>
      <button type="button" className="card__add" onClick={onClick}>
        <Plus />
        <span className="sr-only">{label}</span>
      </button>
    </li>
  );
}
