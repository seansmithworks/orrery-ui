import { useState } from "react";
import { Dialog } from "./kit";

export default function DeleteProject() {
  const [deleted, setDeleted] = useState(false);

  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-12)",
        padding: "var(--space-20)",
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "var(--page)",
        color: "var(--text)",
      }}
    >
      <Dialog.Root>
        <Dialog.Trigger variant="secondary">Delete project</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Header>
            <Dialog.Title>Delete this project?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Description>
            Its files and history are removed. This cannot be undone.
          </Dialog.Description>
          <Dialog.Actions>
            <Dialog.Close variant="secondary">Keep project</Dialog.Close>
            <Dialog.Close variant="primary" onClick={() => setDeleted(true)}>
              Delete
            </Dialog.Close>
          </Dialog.Actions>
        </Dialog.Popup>
      </Dialog.Root>
      <span role="status">{deleted ? "Project deleted." : ""}</span>
    </main>
  );
}
