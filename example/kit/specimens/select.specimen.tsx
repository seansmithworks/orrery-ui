import { Fragment, useState, type ReactNode } from "react";
import { Field, Select } from "../../../kit";
import type { SpecimenProps } from "../specimen";
import { HeldOpenFrame } from "../held-open-frame";
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
 * A held-open list has no keyboard or pointer on it, so UI SDK highlights nothing. Each picture sets
 * the attribute the kit's highlight rule reads, data-highlighted, the way data-preview forces hover
 * and focus elsewhere on the page: on another item than the selected one, to show both states, or on
 * the selected one, as the list looks when the keyboard opens it.
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

function BodyItems({ highlight }: { highlight: string }) {
  return (
    <>
      <Select.Group>
        <Select.GroupLabel>Inner planets</Select.GroupLabel>
        {Object.entries(INNER).map(([value, label]) => (
          <Select.Item
            key={value}
            value={value}
            data-highlighted={value === highlight ? "" : undefined}
          >
            {label}
          </Select.Item>
        ))}
      </Select.Group>
      <Select.Separator />
      <Select.Group>
        <Select.GroupLabel>Outer planets</Select.GroupLabel>
        {Object.entries(OUTER).map(([value, label]) => (
          <Select.Item
            key={value}
            value={value}
            data-highlighted={value === highlight ? "" : undefined}
          >
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

const MOONS: Record<string, Record<string, string>> = {
  Earth: { moon: "Moon" },
  Mars: { phobos: "Phobos", deimos: "Deimos" },
  Jupiter: {
    io: "Io",
    europa: "Europa",
    ganymede: "Ganymede",
    callisto: "Callisto",
  },
  Saturn: {
    titan: "Titan",
    enceladus: "Enceladus",
    mimas: "Mimas",
    rhea: "Rhea",
  },
};
const ALL_MOONS = Object.assign({}, ...Object.values(MOONS));

/**
 * A live grouped list longer than the popup's max height, so the clamp and the scroll run for real
 * (the held-open frames below pin their placement, so they cannot show either). Closed at rest.
 */
function LongListCell() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  return (
    <div className="spec-cell" data-cell="long list">
      <span className="spec-label" aria-hidden="true">
        long list
      </span>
      <Field.Root>
        <Field.Label>Moon</Field.Label>
        <Select.Root items={ALL_MOONS} defaultValue="europa">
          <Select.Trigger />
          <Select.Popup container={portal}>
            {Object.entries(MOONS).map(([planet, moons], i) => (
              <Fragment key={planet}>
                {i > 0 && <Select.Separator />}
                <Select.Group>
                  <Select.GroupLabel>{planet}</Select.GroupLabel>
                  {Object.entries(moons).map(([value, label]) => (
                    <Select.Item key={value} value={value}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Fragment>
            ))}
          </Select.Popup>
        </Select.Root>
      </Field.Root>
      <div className="spec-select-portal" ref={setPortal} />
    </div>
  );
}

/**
 * The open state, held open inside its own frame (../held-open-frame.tsx), never the panel's live
 * portal: the frame's document is the popup's viewport, whatever the library does with a popup.
 * Not modal, so the rest of the page stays usable; inert, because it is a picture of the open
 * state (a held-open list focuses its selected item on mount).
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
  return (
    <div className="spec-cell spec-select-wide" data-cell={name}>
      <span className="spec-label" aria-hidden="true">
        {name}
      </span>
      <HeldOpenFrame
        className="spec-select-frame"
        bodyClassName="spec-select-frame__body"
        title={`${label} select, ${name}, held open`}
        inert
      >
        {(body) => (
          <Field.Root>
            <Field.Label>{label}</Field.Label>
            <Select.Root items={items} defaultValue={value} open modal={false}>
              <Select.Trigger />
              <Select.Popup container={body}>{children}</Select.Popup>
            </Select.Root>
          </Field.Root>
        )}
      </HeldOpenFrame>
    </div>
  );
}

export default function SelectSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      {CELLS.map((c) => (
        <ClosedCell key={c.name} cell={c} />
      ))}
      <LongListCell />
      <OpenCell name="open" label="Orbit" items={ORBITS} value="vesta">
        <OrbitItems highlight="ceres" />
      </OpenCell>
      <OpenCell
        name="disabled highlighted"
        label="Orbit"
        items={ORBITS}
        value="kepler"
      >
        <OrbitItems highlight="pallas" />
      </OpenCell>
      <OpenCell name="groups" label="Body" items={BODIES} value="mars">
        <BodyItems highlight="mars" />
      </OpenCell>
    </div>
  );
}
