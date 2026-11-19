import { useRef, useState } from "react";
import { Button, Card, Field, Input, Menu } from "./kit";

type Member = { id: string; name: string; role: string };

const CREW: Member[] = [
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
  const [crew, setCrew] = useState(CREW);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const query = filter.trim().toLowerCase();
  const shown = crew.filter((m) => m.name.toLowerCase().includes(query));

  function act(member: Member, action: string) {
    if (action === "remove") {
      setCrew((all) => all.filter((m) => m.id !== member.id));
      setStatus(`${member.name} removed from crew.`);
    } else if (action === "edit") {
      setStatus(`Editing ${member.name}.`);
    } else {
      setStatus(`Reassigning ${member.name}.`);
    }
  }

  return (
    <main
      style={{
        boxSizing: "border-box",
        maxWidth: "var(--layout-measure)",
        margin: "0 auto",
        padding: "var(--space-24) var(--space-16)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-16)",
        background: "var(--page)",
        color: "var(--text)",
        minHeight: "100vh",
      }}
    >
      <h1 ref={heading} tabIndex={-1} style={{ margin: 0 }}>
        Crew
      </h1>

      <Field.Root name="filter">
        <Field.Label>Filter crew</Field.Label>
        <Input
          ref={search}
          type="search"
          autoComplete="off"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </Field.Root>

      {shown.length > 0 ? (
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
          {shown.map((member) => (
            <Card.Root key={member.id} render={<li />}>
              <Card.Body>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-16)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>{member.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{member.role}</span>
                  </div>
                  <Menu.Root onAction={(value) => act(member, String(value))}>
                    <Menu.Trigger
                      variant="quiet"
                      size="s"
                      aria-label={`Actions for ${member.name}`}
                    >
                      <MoreGlyph />
                    </Menu.Trigger>
                    <Menu.Popup align="end" finalFocus={heading}>
                      <Menu.Item value="edit">Edit</Menu.Item>
                      <Menu.Item value="reassign">Reassign</Menu.Item>
                      <Menu.Item value="remove">Remove</Menu.Item>
                    </Menu.Popup>
                  </Menu.Root>
                </div>
              </Card.Body>
            </Card.Root>
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
          <p style={{ margin: 0 }}>
            {crew.length === 0 ? "No crew left on the roster." : "No crew match your filter."}
          </p>
          {crew.length > 0 && (
            <Button
              onClick={() => {
                setFilter("");
                search.current?.focus();
              }}
            >
              Clear filter
            </Button>
          )}
        </div>
      )}

      <span role="status" style={{ color: "var(--text-muted)" }}>
        {status}
      </span>
    </main>
  );
}
