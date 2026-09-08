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
        <label htmlFor="playlist-name">Name</label>
        <input
          id="playlist-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Late night mix"
          maxLength={60}
          // Autofocus is appropriate here: the dialog exists to take this input.
          autoFocus
        />
        <button type="submit" className="button button-primary" disabled={!name.trim()}>
          Create playlist
        </button>
      </form>
    </Modal>
  );
}
