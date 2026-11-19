import { useRef, useState } from "react";
import { Button, Field, Input, Menu } from "./kit";
import "./solution.css";

type Person = { id: string; name: string; role: string };

const CREW: Person[] = [
  { id: "ada", name: "Ada Okafor", role: "Flight engineer" },
  { id: "bo", name: "Bo Lindqvist", role: "Navigator" },
  { id: "chen", name: "Chen Wei", role: "Pilot" },
  { id: "dara", name: "Dara Moss", role: "Medic" },
  { id: "eli", name: "Eli Hart", role: "Comms" },
];

function MoreGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="4.5" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15.5" cy="10" r="1.5" />
    </svg>
  );
}

export default function CrewRoster() {
  const [crew, setCrew] = useState(CREW);
  const [filter, setFilter] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  const query = filter.trim().toLowerCase();
  const shown = crew.filter((p) => p.name.toLowerCase().includes(query));

  return (
    <main className="crew">
      <h1 className="crew__title" ref={heading} tabIndex={-1}>
        Crew
      </h1>
      <Field.Root name="filter">
        <Field.Label>Filter crew</Field.Label>
        <Input
          type="search"
          autoComplete="off"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </Field.Root>

      {shown.length > 0 ? (
        <ul className="crew__list">
          {shown.map((p) => (
            <li key={p.id} className="crew__row">
              <div className="crew__who">
                <span className="crew__name">{p.name}</span>
                <span className="crew__role">{p.role}</span>
              </div>
              <Menu.Root
                onAction={(value) => {
                  if (value === "remove")
                    setCrew((all) => all.filter((x) => x.id !== p.id));
                }}
              >
                <Menu.Trigger
                  variant="quiet"
                  size="s"
                  aria-label={`Actions for ${p.name}`}
                  data-icon=""
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
        <div className="crew__empty" role="status">
          <p>No crew match your filter.</p>
          <Button onClick={() => setFilter("")}>Clear filter</Button>
        </div>
      )}
    </main>
  );
}
