import { useRef, useState } from "react";
import { Button, Field, Input, Menu } from "./kit";

const INITIAL_CREW = [
  { id: "ada", name: "Ada Okafor", role: "Flight engineer" },
  { id: "bo", name: "Bo Lindqvist", role: "Navigator" },
  { id: "chen", name: "Chen Wei", role: "Pilot" },
  { id: "dara", name: "Dara Moss", role: "Medic" },
  { id: "eli", name: "Eli Hart", role: "Comms" },
];

function MoreGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}

export default function CrewRoster() {
  const [crew, setCrew] = useState(INITIAL_CREW);
  const [filter, setFilter] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  const query = filter.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(query));

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-16)",
        maxWidth: "var(--layout-measure)",
        padding: "var(--space-24)",
        color: "var(--text)",
        background: "var(--page)",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <h1 ref={heading} tabIndex={-1} style={{ margin: 0 }}>
        Crew
      </h1>

      <Field.Root name="filter">
        <Field.Label>Filter crew</Field.Label>
        <Input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </Field.Root>

      {visible.length > 0 ? (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-8)",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {visible.map((person) => (
            <li
              key={person.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-16)",
                padding: "var(--space-8) var(--space-12)",
                background: "var(--layer-1)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span>{person.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{person.role}</span>
              </div>
              <Menu.Root
                onAction={(value) => {
                  if (value === "remove") {
                    setCrew((all) => all.filter((p) => p.id !== person.id));
                  }
                }}
              >
                <Menu.Trigger
                  variant="quiet"
                  size="s"
                  aria-label={`Actions for ${person.name}`}
                >
                  <MoreGlyph />
                </Menu.Trigger>
                <Menu.Popup align="end" finalFocus={() => heading.current}>
                  <Menu.Item value="edit">Edit</Menu.Item>
                  <Menu.Item value="reassign">Reassign</Menu.Item>
                  <Menu.Item value="remove">Remove</Menu.Item>
                </Menu.Popup>
              </Menu.Root>
            </li>
          ))}
        </ul>
      ) : (
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
      )}
    </main>
  );
}
