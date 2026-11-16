import { useState, type ReactNode } from "react";
import { Field, Select } from "../../../kit";
import type { SpecimenProps } from "../specimen";
import "./select.specimen.css";

export const block = "Select";
export const note = "popup drawing: strawman, Sean's call 8";
// The kit's CSS declares the trigger's height and the items' minimum height.
export const fixedSize = { height: ".orr-select, .orr-select__item" };

const ORBITS = {
  kepler: "Kepler",
  vesta: "Vesta",
  ceres: "Ceres",
  pallas: "Pallas",
};
const INNER = { mercury: "Mercury", venus: "Venus", mars: "Mars" };
const OUTER = { jupiter: "Jupiter", saturn: "Saturn" };
const BODIES = { ...INNER, ...OUTER };

type Cell = {
  name: string;
  root?: { invalid?: boolean; disabled?: boolean };
  value?: string | null;
  trigger?: Record<string, unknown>;
  description?: string;
  error?: string;
};

const CELLS: Cell[] = [
  { name: "rest", value: "kepler", description: "The chart follows it." },
  { name: "hover", value: "kepler", trigger: { "data-preview": "hover" } },
  { name: "focus", value: "kepler", trigger: { "data-preview": "focus" } },
  { name: "placeholder", value: null },
  {
    name: "invalid",
    root: { invalid: true },
    value: null,
    error: "Choose an orbit.",
  },
  { name: "disabled", root: { disabled: true }, value: "kepler" },
];

/**
 * Base UI highlights the selected item when the list opens. To show "highlighted" and "selected" on two
 * items in one held-open picture, the specimen moves the attribute the kit's highlight rule reads,
 * data-highlighted, the way data-preview forces hover and focus elsewhere on the page.
 */
function OrbitItems({ highlight }: { highlight?: string }) {
  return (
    <>
      {Object.entries(ORBITS).map(([value, label]) => (
        <Select.Item
          key={value}
          value={value}
          disabled={value === "pallas"}
          {...(highlight && {
            "data-highlighted": value === highlight ? "" : undefined,
          })}
        >
          {label}
        </Select.Item>
      ))}
    </>
  );
}

function BodyItems() {
  return (
    <>
      <Select.Group>
        <Select.GroupLabel>Inner planets</Select.GroupLabel>
        {Object.entries(INNER).map(([value, label]) => (
          <Select.Item key={value} value={value}>
            {label}
          </Select.Item>
        ))}
      </Select.Group>
      <Select.Separator />
      <Select.Group>
        <Select.GroupLabel>Outer planets</Select.GroupLabel>
        {Object.entries(OUTER).map(([value, label]) => (
          <Select.Item key={value} value={value}>
            {label}
          </Select.Item>
        ))}
      </Select.Group>
    </>
  );
}

/** A live Select whose popup portals into a node in its own cell, so it carries the panel's brand and mode. */
function ClosedCell({ cell }: { cell: Cell }) {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  return (
    <div className="spec-cell" data-cell={cell.name}>
      <span className="spec-label" aria-hidden="true">
        {cell.name}
      </span>
      <Field.Root {...cell.root}>
        <Field.Label>Orbit</Field.Label>
        <Select.Root items={ORBITS} defaultValue={cell.value}>
          <Select.Trigger placeholder="Choose an orbit" {...cell.trigger} />
          <Select.Popup container={portal}>
            <OrbitItems />
          </Select.Popup>
        </Select.Root>
        {cell.description && (
          <Field.Description>{cell.description}</Field.Description>
        )}
        {cell.error && <Field.Error match>{cell.error}</Field.Error>}
      </Field.Root>
      <div className="spec-select-portal" ref={setPortal} />
    </div>
  );
}

/**
 * The open state, held open inside its own frame (specimen CSS: contain), never the panel's live
 * portal. Not modal, so the rest of the page stays usable. The frame is held in state: the
 * portal needs its container before it mounts.
 */
function OpenCell({
  name,
  label,
  items,
  value,
  children,
}: {
  name: string;
  label: string;
  items: Record<string, string>;
  value: string;
  children: ReactNode;
}) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <div className="spec-cell spec-select-wide" data-cell={name}>
      <span className="spec-label" aria-hidden="true">
        {name}
      </span>
      <div className="spec-select-frame" ref={setFrame} inert>
        <Field.Root>
          <Field.Label>{label}</Field.Label>
          {frame && (
            <Select.Root items={items} defaultValue={value} open modal={false}>
              <Select.Trigger />
              <Select.Popup container={frame}>{children}</Select.Popup>
            </Select.Root>
          )}
        </Field.Root>
      </div>
    </div>
  );
}

export default function SelectSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      {CELLS.map((c) => (
        <ClosedCell key={c.name} cell={c} />
      ))}
      <OpenCell name="open" label="Orbit" items={ORBITS} value="vesta">
        <OrbitItems highlight="ceres" />
      </OpenCell>
      <OpenCell name="groups" label="Body" items={BODIES} value="mars">
        <BodyItems />
      </OpenCell>
    </div>
  );
}
