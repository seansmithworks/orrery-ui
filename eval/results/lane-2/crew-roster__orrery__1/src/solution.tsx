import { useRef, useState } from "react";
import { Button, Field, Input, Menu } from "./kit";

const INITIAL = [
  { id: "ada", name: "Ada Okafor", role: "Flight engineer" },
  { id: "bo", name: "Bo Lindqvist", role: "Navigator" },
  { id: "chen", name: "Chen Wei", role: "Pilot" },
  { id: "dara", name: "Dara Moss", role: "Medic" },
  { id: "eli", name: "Eli Hart", role: "Comms" },
];

function DotsGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}

export default function CrewRoster() {
  const [crew, setCrew] = useState(INITIAL);
  const [filter, setFilter] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const removed = useRef<string | null>(null);

  const query = filter.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(query));

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-24)",
        padding: "var(--space-24)",
        maxWidth: "var(--layout-measure)",
        margin: "0 auto",
        color: "var(--text)",
      }}
    >
      <h1 ref={heading} tabIndex={-1} style={{ margin: 0 }}>
        Crew
      </h1>

      <Field.Root name="filter">
        <Field.Label>Filter crew</Field.Label>
        <Input
          type="search"
          autoComplete="off"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </Field.Root>

      {visible.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "var(--space-12)",
          }}
        >
          <p role="status" style={{ margin: 0 }}>
            No crew match your filter.
          </p>
          <Button variant="secondary" onClick={() => setFilter("")}>
            Clear filter
          </Button>
        </div>
      ) : (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            margin: 0,
            padding: 0,
            listStyle: "none",
            border: "1px solid var(--line)",
          }}
        >
          {visible.map((person, index) => (
            <li
              key={person.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-16)",
                padding: "var(--space-12) var(--space-16)",
                background: "var(--layer-1)",
                borderTop: index === 0 ? "none" : "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span>{person.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{person.role}</span>
              </div>
              <Menu.Root
                onAction={(value) => {
                  if (value === "remove") {
                    removed.current = person.id;
                    setCrew((all) => all.filter((p) => p.id !== person.id));
                  }
                }}
              >
                <Menu.Trigger
                  variant="quiet"
                  size="s"
                  aria-label={`Actions for ${person.name}`}
                >
                  <DotsGlyph />
                </Menu.Trigger>
                <Menu.Popup
                  align="end"
                  finalFocus={() =>
                    removed.current === person.id ? heading.current : undefined
                  }
                >
                  <Menu.Item value="edit">Edit</Menu.Item>
                  <Menu.Item value="reassign">Reassign</Menu.Item>
                  <Menu.Item value="remove">Remove</Menu.Item>
                </Menu.Popup>
              </Menu.Root>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
