import { useState } from 'react';
import Modal from '../common/Modal';

export default function PlaylistDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name);
    setName('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New playlist">
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="playlist-name">Name</label>
        <input className="field"
          id="playlist-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Late night mix"
          maxLength={60}
          // The dialog exists to take this input, so focus it — via
          // data-autofocus, since React's autoFocus is applied while the
          // <dialog> is still inert and showModal() then discards it.
          data-autofocus
        />
        <button type="submit" className="button button-primary" disabled={!name.trim()}>
          Create playlist
        </button>
      </form>
    </Modal>
  );
}
