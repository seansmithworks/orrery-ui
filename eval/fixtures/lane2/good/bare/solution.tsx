// Positive control, bare condition, scenario confirm-delete: must score 1.00 on every headline scorer.
import { useRef, useState } from "react";
import "./solution.css";

export default function DeleteProject() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="page">
      <button
        type="button"
        className="btn"
        onClick={() => dialog.current?.showModal()}
      >
        Delete project
      </button>
      <span role="status">{deleted ? "Project deleted." : ""}</span>
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="t"
        aria-describedby="d"
      >
        <h2 id="t">Delete this project?</h2>
        <p id="d">Its files and history are removed. This cannot be undone.</p>
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => dialog.current?.close()}
          >
            Keep project
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              dialog.current?.close();
              setDeleted(true);
            }}
          >
            Delete
          </button>
        </div>
      </dialog>
    </div>
  );
}
