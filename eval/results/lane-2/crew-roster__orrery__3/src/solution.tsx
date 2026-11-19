import { useRef, useState } from "react";
import { Button, Field, Input, Menu } from "./kit";
import "./solution.css";

const INITIAL = [
  { id: "ada", name: "Ada Okafor", role: "Flight engineer" },
  { id: "bo", name: "Bo Lindqvist", role: "Navigator" },
  { id: "chen", name: "Chen Wei", role: "Pilot" },
  { id: "dara", name: "Dara Moss", role: "Medic" },
  { id: "eli", name: "Eli Hart", role: "Comms" },
];

function MoreGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}

export default function CrewRoster() {
  const [crew, setCrew] = useState(INITIAL);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(q));

  function act(action: string, id: string) {
    const person = crew.find((p) => p.id === id);
    if (!person) return;
    if (action === "remove") {
      setCrew((all) => all.filter((p) => p.id !== id));
      setStatus(`${person.name} removed.`);
    } else {
      setStatus(`${action === "edit" ? "Edit" : "Reassign"} ${person.name}.`);
    }
  }

  return (
    <main className="crew">
      <h1 ref={headingRef} tabIndex={-1}>
        Crew
      </h1>

      <Field.Root name="filter">
        <Field.Label>Filter crew</Field.Label>
        <Input
          ref={inputRef}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Field.Root>

      {visible.length > 0 ? (
        <ul className="crew-list">
          {visible.map((p) => (
            <li key={p.id} className="crew-row">
              <div className="crew-person">
                <span>{p.name}</span>
                <span className="crew-role">{p.role}</span>
              </div>
              <Menu.Root onAction={(value) => act(String(value), p.id)}>
                <Menu.Trigger
                  variant="quiet"
                  size="s"
                  aria-label={`Actions for ${p.name}`}
                >
                  <MoreGlyph />
                </Menu.Trigger>
                <Menu.Popup finalFocus={() => (inputRef.current ?? undefined)}>
                  <Menu.Item value="edit">Edit</Menu.Item>
                  <Menu.Item value="reassign">Reassign</Menu.Item>
                  <Menu.Item value="remove">Remove</Menu.Item>
                </Menu.Popup>
              </Menu.Root>
            </li>
          ))}
        </ul>
      ) : (
        <div className="crew-empty">
          <p>No crew match your filter.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            Clear filter
          </Button>
        </div>
      )}

      <span role="status" className="crew-role">
        {status}
      </span>
    </main>
  );
}
