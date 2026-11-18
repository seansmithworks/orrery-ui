import { useRef, useState } from "react";
import "./solution.css";

export default function Solution() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState("");

  const open = () => {
    setStatus("");
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const confirm = () => {
    close();
    setStatus("Project deleted.");
  };

  return (
    <main className="dp-page">
      <button type="button" className="dp-btn dp-btn-secondary" onClick={open}>
        Delete project
      </button>
      <p role="status" className="dp-status">
        {status}
      </p>

      <dialog
        ref={dialogRef}
        className="dp-dialog"
        aria-labelledby="dp-title"
        aria-describedby="dp-desc"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <h2 id="dp-title" className="dp-title">
          Delete this project?
        </h2>
        <p id="dp-desc" className="dp-desc">
          Its files and history are removed. This cannot be undone.
        </p>
        <div className="dp-actions">
          <button type="button" className="dp-btn dp-btn-secondary" autoFocus onClick={close}>
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
