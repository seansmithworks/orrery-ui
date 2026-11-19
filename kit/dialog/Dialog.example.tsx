// Golden example: confirm before deleting an orbit. Close the dialog any way but Delete and focus returns to
// its trigger, the default: set no finalFocus for that, on a Dialog, Menu or Popover. Only Delete removes the
// row, and the trigger with it, so only then does finalFocus send focus to the list heading. Spacing is token
// variables only.
import { useRef, useState } from "react";
import { Dialog } from "../index";

const ORBITS = [
  { id: "kepler", name: "Kepler", moons: 12 },
  { id: "vesta", name: "Vesta", moons: 3 },
];

export default function DeleteOrbit() {
  const [orbits, setOrbits] = useState(ORBITS);
  const heading = useRef<HTMLHeadingElement>(null);
  // The orbit being deleted, read when its dialog closes.
  const deleting = useRef<string | null>(null);

  return (
    <section aria-labelledby="orbits-heading">
      <h2 id="orbits-heading" ref={heading} tabIndex={-1} style={{ margin: 0 }}>
        Orbits
      </h2>
      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-12)",
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {orbits.map((orbit) => (
          <li
            key={orbit.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-16)",
            }}
          >
            <span>{orbit.name}</span>
            <Dialog.Root>
              <Dialog.Trigger
                variant="secondary"
                aria-label={`Delete ${orbit.name}`}
              >
                Delete
              </Dialog.Trigger>
              {/* Unset or undefined, finalFocus is the trigger. Override it only when the trigger is gone at close. */}
              <Dialog.Popup
                finalFocus={() =>
                  deleting.current === orbit.id ? heading.current : undefined
                }
              >
                <Dialog.Header>
                  <Dialog.Title>Delete {orbit.name}?</Dialog.Title>
                  <Dialog.CloseIcon />
                </Dialog.Header>
                <Dialog.Description>
                  Its {orbit.moons} moons and their notes go with it. This
                  cannot be undone.
                </Dialog.Description>
                <Dialog.Actions>
                  <Dialog.Close variant="secondary">Keep orbit</Dialog.Close>
                  <Dialog.Close
                    variant="primary"
                    onClick={() => {
                      deleting.current = orbit.id;
                      setOrbits((all) => all.filter((o) => o.id !== orbit.id));
                    }}
                  >
                    Delete orbit
                  </Dialog.Close>
                </Dialog.Actions>
              </Dialog.Popup>
            </Dialog.Root>
          </li>
        ))}
      </ul>
    </section>
  );
}
