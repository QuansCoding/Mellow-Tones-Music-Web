import Modal from '../common/Modal';
import SearchAddList from './SearchAddList';

/**
 * Type-to-find picker for Liked Songs and Favourite Artists.
 *
 * It used to render the entire catalogue in one list, which is fine at three
 * songs and unusable at three hundred. Rows are still toggles rather than a
 * submit-based form, so the library updates live behind the dialog and there
 * is no save step to forget.
 *
 * `countLabel` keeps the running total visible: after adding eight songs while
 * scrolling, "12 liked songs" is the only feedback that says how far you got.
 *
 * Modal unmounts its children when closed, so the query resets on reopen with
 * no effect needed here.
 */
export default function Picker({
  open,
  onClose,
  title,
  kind,
  placeholder,
  prompt,
  countLabel,
  isSelected,
  onToggle,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {countLabel && <p className="picker__count">{countLabel}</p>}
      <SearchAddList
        kind={kind}
        placeholder={placeholder}
        prompt={prompt}
        isSelected={isSelected}
        onToggle={onToggle}
        autoFocus
      />
    </Modal>
  );
}
