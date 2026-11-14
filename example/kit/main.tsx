import { StrictMode, useRef, useState, type ReactNode, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  IconButton,
  Field,
  Input,
  Dialog,
  type ButtonVariant,
} from "../../kit";
import "../../kit/kit.css";
import "./specimen.css";
import { installBrandTokens } from "./scope";

installBrandTokens();

type Panel = {
  id: string;
  brand: string;
  theme: "light" | "dark";
  mode: string;
};
const PANELS: Panel[] = [
  { id: "orrery-light", brand: "orrery", theme: "light", mode: "light" },
  { id: "orrery-dark", brand: "orrery", theme: "dark", mode: "dark" },
  { id: "solar", brand: "solar", theme: "dark", mode: "dark, fixed" },
];

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "quiet"];

type State = { name: string; props: Record<string, unknown> };
const BUTTON_STATES: State[] = [
  { name: "rest", props: {} },
  { name: "hover", props: { "data-preview": "hover" } },
  { name: "pressed", props: { "data-preview": "active" } },
  { name: "focus", props: { "data-preview": "focus" } },
  { name: "disabled", props: { disabled: true } },
  { name: "loading", props: { loading: true } },
  { name: "size s", props: { size: "s" } },
];

function PlusGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="spec-block">
      <header className="spec-block__head">
        <h3 className="spec-block__title">{title}</h3>
        {note && <span className="spec-chip">{note}</span>}
      </header>
      {children}
    </section>
  );
}

function StateTable({
  render,
}: {
  render: (variant: ButtonVariant, state: State) => ReactNode;
}) {
  return (
    <table className="spec-table">
      <thead>
        <tr>
          <td />
          {VARIANTS.map((v) => (
            <th key={v} scope="col" className="spec-label">
              {v}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BUTTON_STATES.map((s) => (
          <tr key={s.name}>
            <th scope="row" className="spec-label">
              {s.name}
            </th>
            {VARIANTS.map((v) => (
              <td key={v}>{render(v, s)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type FieldState = {
  name: string;
  root?: { invalid?: boolean; disabled?: boolean };
  input?: Record<string, unknown>;
  description?: string;
  error?: string;
};
const FIELD_STATES: FieldState[] = [
  {
    name: "rest",
    input: { placeholder: "name@studio.com" },
    description: "We reply within a day.",
  },
  {
    name: "hover",
    input: { placeholder: "name@studio.com", "data-preview": "hover" },
  },
  {
    name: "focus",
    input: { placeholder: "name@studio.com", "data-preview": "focus" },
  },
  { name: "filled", input: { defaultValue: "ada@orrery.dev" } },
  {
    name: "invalid",
    root: { invalid: true },
    input: { defaultValue: "ada@orrery" },
    error: "Enter a full address.",
  },
  {
    name: "disabled",
    root: { disabled: true },
    input: { defaultValue: "ada@orrery.dev" },
  },
  {
    name: "read-only",
    input: { defaultValue: "ada@orrery.dev", readOnly: true },
    description: "Set by your team.",
  },
];

function FieldSpecimen({ state }: { state: FieldState }) {
  return (
    <div className="spec-cell">
      <span className="spec-label" aria-hidden="true">
        {state.name}
      </span>
      <Field.Root {...state.root}>
        <Field.Label>Email</Field.Label>
        <Input type="email" {...state.input} />
        {state.description && (
          <Field.Description>{state.description}</Field.Description>
        )}
        {state.error && <Field.Error match>{state.error}</Field.Error>}
      </Field.Root>
    </div>
  );
}

function RenameDialogBody({ live }: { live: boolean }) {
  return (
    <>
      <Dialog.Header>
        <Dialog.Title>Rename orbit</Dialog.Title>
        <Dialog.CloseIcon />
      </Dialog.Header>
      <Dialog.Description>
        The new name shows on every chart.
      </Dialog.Description>
      {live && (
        <Field.Root className="spec-dialog-field">
          <Field.Label>Name</Field.Label>
          <Input defaultValue="Orbit 7" />
        </Field.Root>
      )}
      <Dialog.Actions>
        <Dialog.Close variant="secondary">Cancel</Dialog.Close>
        <Dialog.Close variant="primary">Save</Dialog.Close>
      </Dialog.Actions>
    </>
  );
}

function StaticDialog() {
  // The portal needs its container before it mounts, so the frame is held in state, not a ref.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <div className="spec-dialog-frame" ref={setFrame}>
      <div className="spec-dialog-behind" aria-hidden="true">
        <p className="spec-dialog-behind__title">Orbit 7</p>
        <p>Last edited today</p>
      </div>
      {frame && (
        <Dialog.Root open modal={false} disablePointerDismissal>
          <Dialog.Popup contained container={frame} initialFocus={false}>
            <RenameDialogBody live={false} />
          </Dialog.Popup>
        </Dialog.Root>
      )}
    </div>
  );
}

function LiveRow({ panel }: { panel: RefObject<HTMLElement | null> }) {
  return (
    <div className="spec-live">
      <Field.Root className="spec-live__field">
        <Field.Label>Search orbits</Field.Label>
        <Input placeholder="Type to search" />
      </Field.Root>
      <Dialog.Root>
        <Dialog.Trigger variant="primary">Rename orbit</Dialog.Trigger>
        <Dialog.Popup container={panel}>
          <RenameDialogBody live />
        </Dialog.Popup>
      </Dialog.Root>
    </div>
  );
}

function PanelView({ panel }: { panel: Panel }) {
  const ref = useRef<HTMLElement>(null);
  const titleId = `${panel.id}-title`;
  return (
    <section
      ref={ref}
      className="spec-panel"
      data-panel={panel.id}
      data-brand={panel.brand}
      data-theme={panel.theme}
      aria-labelledby={titleId}
    >
      <header className="spec-panel__head">
        <h2 id={titleId} className="spec-panel__title">
          {panel.brand}
        </h2>
        <span className="spec-label">{panel.mode}</span>
      </header>

      <Block title="Live">
        <LiveRow panel={ref} />
      </Block>

      <Block title="Button">
        <StateTable
          render={(v, s) => (
            <Button variant={v} {...s.props}>
              Save
            </Button>
          )}
        />
      </Block>

      <Block title="IconButton">
        <StateTable
          render={(v, s) => (
            <IconButton variant={v} aria-label="Add orbit" {...s.props}>
              <PlusGlyph />
            </IconButton>
          )}
        />
      </Block>

      <Block title="Field">
        <div className="spec-fields">
          {FIELD_STATES.map((s) => (
            <FieldSpecimen key={s.name} state={s} />
          ))}
        </div>
      </Block>

      <Block title="Dialog" note="strawman, Sean's call 8">
        <StaticDialog />
      </Block>
    </section>
  );
}

function Specimen() {
  return (
    <main className="spec">
      <header className="spec__head">
        <h1 className="spec__title">Kit exemplars</h1>
        <p className="spec__sub">
          Button, IconButton, Field, Dialog. Brand orrery light and dark, brand
          solar.
        </p>
      </header>
      <div className="spec__grid">
        {PANELS.map((p) => (
          <PanelView key={p.id} panel={p} />
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Specimen />
  </StrictMode>,
);
