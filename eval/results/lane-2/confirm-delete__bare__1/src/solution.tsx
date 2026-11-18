import { useRef, useState } from "react";
import "./solution.css";

export default function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleted, setDeleted] = useState(false);

  const open = () => {
    setDeleted(false);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const confirm = () => {
    close();
    setDeleted(true);
  };

  return (
    <main className="dp-page">
      <button type="button" className="dp-btn dp-btn-secondary" onClick={open}>
        Delete project
      </button>

      <p className="dp-status" role="status">
        {deleted ? "Project deleted." : ""}
      </p>

      <dialog
        ref={dialogRef}
        className="dp-dialog"
        aria-labelledby="dp-title"
        aria-describedby="dp-desc"
      >
        <h2 id="dp-title" className="dp-title">Delete this project?</h2>
        <p id="dp-desc" className="dp-desc">
          Its files and history are removed. This cannot be undone.
        </p>
        <div className="dp-actions">
          <button
            type="button"
            className="dp-btn dp-btn-secondary"
            onClick={close}
            autoFocus
          >
            Keep project
          </button>
          <button type="button" className="dp-btn dp-btn-primary" onClick={confirm}>
            Delete
          </button>
        </div>
      </dialog>
    </main>
  );
}
