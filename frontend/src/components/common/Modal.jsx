import { useEffect, useRef } from 'react';
import { Close } from '../icons/Icons';

/**
 * Thin wrapper over the native <dialog>.
 *
 * showModal() gives focus trapping, the inert backdrop, Escape-to-close and
 * focus restoration for free — all things a div-based modal has to reimplement
 * badly.
 */
export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React applies `autoFocus` during commit, while the dialog is still
      // closed and inert, so the focus is dropped and showModal() lands on
      // the first focusable element instead — the close button. A picker
      // whose whole purpose is typing must not open with the caret there.
      // React 19 never writes an `autofocus` attribute, so children opt in
      // with data-autofocus and this re-applies it after showModal().
      dialog.querySelector('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      // A click that lands on the dialog itself rather than the panel is a
      // click on the backdrop.
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {/* Contents only exist while open. A closed <dialog> is display:none, so
          leaving them mounted is invisible but still duplicates every list in
          the DOM once per dialog on the page. */}
      {open && (
        <div className="modal__panel">
          <header className="modal__head">
            <h2 className="modal__title">{title}</h2>
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <Close size={18} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
