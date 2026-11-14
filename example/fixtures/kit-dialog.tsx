// Fixture for example/kit.spec.ts: a nested dialog, and a dialog whose trigger unmounts while it is open.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Dialog } from "../../kit";
import "../../tokens/generated/css/orrery.css";
import "../../tokens/generated/css/orrery.system.css";
import "../../kit/kit.css";

function Nested() {
  return (
    <Dialog.Root>
      <Dialog.Trigger variant="primary">Open settings</Dialog.Trigger>
      <Dialog.Popup>
        <Dialog.Header>
          <Dialog.Title>Orbit settings</Dialog.Title>
          <Dialog.CloseIcon />
        </Dialog.Header>
        <Dialog.Description>Name, colour and visibility.</Dialog.Description>
        <Dialog.Actions>
          <Dialog.Root>
            <Dialog.Trigger variant="secondary">Delete orbit</Dialog.Trigger>
            <Dialog.Popup>
              <Dialog.Title>Delete orbit?</Dialog.Title>
              <Dialog.Description>This cannot be undone.</Dialog.Description>
              <Dialog.Actions>
                <Dialog.Close variant="secondary">Keep</Dialog.Close>
                <Dialog.Close variant="primary">Delete</Dialog.Close>
              </Dialog.Actions>
            </Dialog.Popup>
          </Dialog.Root>
          <Dialog.Close variant="primary">Done</Dialog.Close>
        </Dialog.Actions>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

function TriggerUnmounts() {
  const [showTrigger, setShowTrigger] = useState(true);
  return (
    <Dialog.Root>
      {showTrigger ? (
        <Dialog.Trigger variant="secondary">Edit orbit</Dialog.Trigger>
      ) : (
        <p>The trigger is gone.</p>
      )}
      <Dialog.Popup>
        <Dialog.Title>Edit orbit</Dialog.Title>
        <Dialog.Description>
          Removing the trigger keeps this dialog open.
        </Dialog.Description>
        <Dialog.Actions>
          <Button variant="secondary" onClick={() => setShowTrigger(false)}>
            Remove the trigger
          </Button>
          <Dialog.Close variant="primary">Done</Dialog.Close>
        </Dialog.Actions>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main
      style={{
        display: "flex",
        gap: "var(--space-16)",
        padding: "var(--space-32)",
      }}
    >
      <Nested />
      <TriggerUnmounts />
    </main>
  </StrictMode>,
);
