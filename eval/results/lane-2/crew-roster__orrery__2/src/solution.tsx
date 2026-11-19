import { useRef, useState } from "react";
import { Button, Field, Input, Menu } from "./kit";

const CREW = [
  { id: "ada", name: "Ada Okafor", role: "Flight engineer" },
  { id: "bo", name: "Bo Lindqvist", role: "Navigator" },
  { id: "chen", name: "Chen Wei", role: "Pilot" },
  { id: "dara", name: "Dara Moss", role: "Medic" },
  { id: "eli", name: "Eli Hart", role: "Comms" },
];

function MoreGlyph() {
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
  const [crew, setCrew] = useState(CREW);
  const [query, setQuery] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const filterWrap = useRef<HTMLDivElement>(null);
  const removed = useRef<string | null>(null);

  const q = query.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(q));

  function clearFilter() {
    setQuery("");
    filterWrap.current?.querySelector("input")?.focus();
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-16)",
        padding: "var(--space-24)",
        maxWidth: "var(--layout-measure)",
        margin: "0 auto",
        color: "var(--text)",
        background: "var(--page)",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <h1 ref={heading} tabIndex={-1} style={{ margin: 0 }}>
        Crew
      </h1>

      <div ref={filterWrap}>
        <Field.Root name="filter">
          <Field.Label>Filter crew</Field.Label>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field.Root>
      </div>

      {visible.length > 0 ? (
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
          {visible.map((p) => (
            <li
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-16)",
                padding: "var(--space-12) var(--space-16)",
                background: "var(--layer-1)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-m, 8px)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span>{p.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{p.role}</span>
              </div>
              <Menu.Root
                onAction={(value) => {
                  if (value === "remove") {
                    removed.current = p.id;
                    setCrew((all) => all.filter((x) => x.id !== p.id));
                  }
                }}
              >
                <Menu.Trigger
                  variant="quiet"
                  size="s"
                  aria-label={`Actions for ${p.name}`}
                >
                  <MoreGlyph />
                </Menu.Trigger>
                <Menu.Popup
                  align="end"
                  finalFocus={() =>
                    removed.current === p.id ? heading.current : undefined
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
      ) : (
        <div
          role="status"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "var(--space-12)",
          }}
        >
          <p style={{ margin: 0 }}>No crew match your filter.</p>
          <Button variant="secondary" onClick={clearFilter}>
            Clear filter
          </Button>
        </div>
      )}
    </main>
  );
}
