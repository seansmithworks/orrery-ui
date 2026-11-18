import { useState, type ReactNode } from "react";
import { Menu } from "../../../kit";
import type { SpecimenProps } from "../specimen";
import { HeldOpenFrame } from "../held-open-frame";
import "./menu.specimen.css";

export const block = "Menu";
export const note = "popup drawing: strawman, Sean's call 8";
// The kit's CSS declares the items' minimum height; the trigger's is the Button's.
export const fixedSize = { height: ".orr-menu__item" };

/**
 * A held-open menu has no keyboard or pointer on it, so UI SDK highlights nothing. Each picture sets
 * the attribute the kit's highlight rule reads, data-highlighted, as the Select specimen does.
 */
function ActionItems({ highlight }: { highlight?: string }) {
  const on = (v: string) => (v === highlight ? "" : undefined);
  return (
    <>
      <Menu.Item value="rename" data-highlighted={on("rename")}>
        Rename
      </Menu.Item>
      <Menu.Item
        value="duplicate"
        shortcut="mod+d"
        data-highlighted={on("duplicate")}
      >
        Duplicate
      </Menu.Item>
      <Menu.Item value="export" disabled data-highlighted={on("export")}>
        Export as image
      </Menu.Item>
      <Menu.Separator />
      <Menu.Group>
        <Menu.GroupLabel>Share</Menu.GroupLabel>
        <Menu.Item value="link" data-highlighted={on("link")}>
          Copy link
        </Menu.Item>
        <Menu.Item value="email" data-highlighted={on("email")}>
          Send by email
        </Menu.Item>
      </Menu.Group>
    </>
  );
}

function ChoiceItems({ highlight }: { highlight: string }) {
  const on = (v: string) => (v === highlight ? "" : undefined);
  return (
    <>
      <Menu.Group>
        <Menu.GroupLabel>Show</Menu.GroupLabel>
        <Menu.CheckboxItem
          value="grid"
          defaultChecked
          data-highlighted={on("grid")}
        >
          Grid
        </Menu.CheckboxItem>
        <Menu.CheckboxItem value="labels" data-highlighted={on("labels")}>
          Body labels
        </Menu.CheckboxItem>
        <Menu.CheckboxItem value="trails" disabled>
          Orbit trails
        </Menu.CheckboxItem>
      </Menu.Group>
      <Menu.Separator />
      <Menu.RadioGroup defaultValue="polar" aria-label="Projection">
        <Menu.GroupLabel>Projection</Menu.GroupLabel>
        <Menu.RadioItem value="polar" data-highlighted={on("polar")}>
          Polar
        </Menu.RadioItem>
        <Menu.RadioItem value="flat" data-highlighted={on("flat")}>
          Flat
        </Menu.RadioItem>
      </Menu.RadioGroup>
      <Menu.Separator />
      <Menu.Item value="reset" data-highlighted={on("reset")}>
        Reset view
      </Menu.Item>
    </>
  );
}

/** A live Menu whose popup portals into a node in its own cell, so it carries the panel's brand and mode. */
function LiveCell() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const [last, setLast] = useState("");
  return (
    <div className="spec-cell" data-cell="rest">
      <span className="spec-label" aria-hidden="true">
        rest
      </span>
      <Menu.Root onAction={(value) => setLast(value)}>
        <Menu.Trigger>Chart</Menu.Trigger>
        <Menu.Popup container={portal}>
          <Menu.Item value="rename">Rename</Menu.Item>
          <Menu.Item value="duplicate" shortcut="mod+d">
            Duplicate
          </Menu.Item>
          <Menu.Item value="export" disabled>
            Export as image
          </Menu.Item>
          <Menu.Separator />
          <Menu.CheckboxItem value="grid" defaultChecked>
            Grid
          </Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.RadioGroup defaultValue="polar" aria-label="Projection">
            <Menu.GroupLabel>Projection</Menu.GroupLabel>
            <Menu.RadioItem value="polar">Polar</Menu.RadioItem>
            <Menu.RadioItem value="flat">Flat</Menu.RadioItem>
          </Menu.RadioGroup>
          <Menu.Separator />
          <Menu.Sub>
            <Menu.SubTrigger>Zoom</Menu.SubTrigger>
            <Menu.SubPopup>
              <Menu.Item value="zoom-in">Zoom in</Menu.Item>
              <Menu.Item value="zoom-out">Zoom out</Menu.Item>
            </Menu.SubPopup>
          </Menu.Sub>
        </Menu.Popup>
      </Menu.Root>
      <output className="spec-menu-last" data-testid="last-action">
        {last}
      </output>
      <div className="spec-menu-portal" ref={setPortal} />
    </div>
  );
}

/** A live Menu whose trigger is the only thing in the cell and which has more items than fit. */
function LongCell() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  return (
    <div className="spec-cell" data-cell="long list">
      <span className="spec-label" aria-hidden="true">
        long list
      </span>
      <Menu.Root>
        <Menu.Trigger>Bodies</Menu.Trigger>
        <Menu.Popup container={portal}>
          {[
            "Centre the chart on the selected body",
            "Mercury",
            "Venus",
            "Earth",
            "Mars",
            "Jupiter",
            "Saturn",
            "Uranus",
            "Neptune",
            "Ceres",
            "Vesta",
          ].map((name) => (
            <Menu.Item key={name} value={name.toLowerCase()}>
              {name}
            </Menu.Item>
          ))}
        </Menu.Popup>
      </Menu.Root>
      <div className="spec-menu-portal" ref={setPortal} />
    </div>
  );
}

/**
 * The open state, held open inside its own frame (../held-open-frame.tsx), never the panel's live
 * portal: the frame's document is the popup's viewport, whatever the library does with a popup. Not
 * modal, so the rest of the page stays usable. Not inert, unlike Select's: the kit's hit-area test
 * presses every Button, the trigger included, and an inert frame cannot be hit-tested.
 */
function OpenCell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="spec-cell spec-menu-wide" data-cell={name}>
      <span className="spec-label" aria-hidden="true">
        {name}
      </span>
      <HeldOpenFrame
        className="spec-menu-frame"
        bodyClassName="spec-menu-frame__body"
        title={`Chart menu, ${name}, held open`}
      >
        {(body) => (
          <Menu.Root open modal={false}>
            <Menu.Trigger>Chart</Menu.Trigger>
            <Menu.Popup container={body}>{children}</Menu.Popup>
          </Menu.Root>
        )}
      </HeldOpenFrame>
    </div>
  );
}

export default function MenuSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      <LiveCell />
      <LongCell />
      <OpenCell name="open">
        <ActionItems highlight="duplicate" />
      </OpenCell>
      <OpenCell name="disabled highlighted">
        <ActionItems highlight="export" />
      </OpenCell>
      <OpenCell name="choices">
        <ChoiceItems highlight="labels" />
      </OpenCell>
    </div>
  );
}
