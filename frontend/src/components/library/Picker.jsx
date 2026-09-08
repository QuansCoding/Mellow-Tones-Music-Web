import Modal from '../common/Modal';

/**
 * Multi-select picker used to fill Liked Songs, Playlists and Favourite
 * Artists. Rows are toggles rather than a submit-based form, so the library
 * updates live behind the dialog and there is no save step to forget.
 */
export default function Picker({
  open,
  onClose,
  title,
  items,
  isSelected,
  onToggle,
  emptyNote,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {items.length === 0 ? (
        <p className="picker__empty">{emptyNote}</p>
      ) : (
        <ul className="picker__list">
          {items.map((item) => {
            const selected = isSelected(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`picker__row${selected ? ' picker__row--on' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onToggle(item.id)}
                >
                  <span className="picker__text">
                    <span className="picker__primary">{item.primary}</span>
                    {item.secondary && (
                      <span className="picker__secondary">{item.secondary}</span>
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
    </Modal>
  );
}
