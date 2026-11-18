import { useRef, useState } from "react";
import "./solution.css";

export default function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleted, setDeleted] = useState(false);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <main className="dc-page">
      <button type="button" className="dc-btn dc-btn-secondary" onClick={open}>
        Delete project
      </button>

      <p role="status" className="dc-status">
        {deleted ? "Project deleted." : ""}
      </p>

      <dialog
        ref={dialogRef}
        className="dc-dialog"
        aria-labelledby="dc-title"
        aria-describedby="dc-desc"
      >
        <h2 id="dc-title" className="dc-title">Delete this project?</h2>
        <p id="dc-desc" className="dc-desc">
          Its files and history are removed. This cannot be undone.
        </p>
        <div className="dc-actions">
          <button type="button" className="dc-btn dc-btn-secondary" autoFocus onClick={close}>
            Keep project
          </button>
          <button
            type="button"
            className="dc-btn dc-btn-primary"
            onClick={() => {
              setDeleted(true);
              close();
            }}
          >
            Delete
          </button>
        </div>
      </dialog>
    </main>
  );
}
