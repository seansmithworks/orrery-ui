// SPIKE page (branch spike/ui-sdk-dialog): the same dialog markup on either implementation.
// ?impl=base renders the kit's Base UI Dialog, ?impl=sdk the UI SDK rebuild in spike/ui-sdk/.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Dialog as BaseDialog, Field, Input } from "../../kit";
import { Dialog as SdkDialog } from "../../spike/ui-sdk/Dialog";
import "../../tokens/generated/css/orrery.css";
import "../../tokens/generated/css/orrery.system.css";
import "../../kit/kit.css";

const impl = new URLSearchParams(location.search).get("impl");
const Dialog = impl === "sdk" ? SdkDialog : BaseDialog;
document.documentElement.dataset.impl = impl === "sdk" ? "sdk" : "base";

function Rename() {
  return (
    <Dialog.Root>
      <Dialog.Trigger variant="primary">Rename orbit</Dialog.Trigger>
      <Dialog.Popup>
        <Dialog.Header>
          <Dialog.Title>Rename orbit</Dialog.Title>
          <Dialog.CloseIcon />
        </Dialog.Header>
        <Dialog.Description>
          The new name shows on every chart.
        </Dialog.Description>
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input defaultValue="Orbit 7" />
        </Field.Root>
        <Dialog.Actions>
          <Dialog.Close variant="secondary">Cancel</Dialog.Close>
          <Dialog.Close variant="primary">Save</Dialog.Close>
        </Dialog.Actions>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

function Nested() {
  return (
    <Dialog.Root>
      <Dialog.Trigger variant="secondary">Open settings</Dialog.Trigger>
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

function App() {
  // Tall page with the controls below the fold, so the scroll-lock check has room to move.
  return (
    <main style={{ padding: "var(--space-32)", minHeight: "300vh" }}>
      <div
        style={{
          display: "flex",
          gap: "var(--space-16)",
          alignItems: "end",
          marginTop: "120vh",
        }}
      >
        <Field.Root>
          <Field.Label>Search orbits</Field.Label>
          <Input placeholder="Type to search" />
        </Field.Root>
        <Rename />
        <Nested />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
