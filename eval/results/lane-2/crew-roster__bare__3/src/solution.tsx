import { useEffect, useRef, useState } from "react";
import "./solution.css";

type Person = { name: string; role: string };

const INITIAL: Person[] = [
  { name: "Ada Okafor", role: "Flight engineer" },
  { name: "Bo Lindqvist", role: "Navigator" },
  { name: "Chen Wei", role: "Pilot" },
  { name: "Dara Moss", role: "Medic" },
  { name: "Eli Hart", role: "Comms" },
];

const ACTIONS = ["Edit", "Reassign", "Remove"] as const;

function RowMenu({
  person,
  onRemove,
}: {
  person: Person;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    const items = Array.from(
      wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  };

  return (
    <div className="crew-menu-wrap" ref={wrap} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="crew-actions-btn"
        aria-label={`Actions for ${person.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="3" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="13" cy="8" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <ul className="crew-menu" role="menu" aria-label={`Actions for ${person.name}`}>
          {ACTIONS.map((a) => (
            <li key={a} role="none">
              <button
                type="button"
                role="menuitem"
                className="crew-menu-item"
                onClick={() => {
                  if (a === "Remove") onRemove();
                  else close(true);
                }}
              >
                {a}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CrewRoster() {
  const [crew, setCrew] = useState<Person[]>(INITIAL);
  const [filter, setFilter] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const q = filter.trim().toLowerCase();
  const shown = crew.filter((p) => p.name.toLowerCase().includes(q));

  return (
    <main className="crew-page">
      <div className="crew-inner">
        <h1 className="crew-title">Crew</h1>

        <div className="crew-field">
          <label htmlFor="crew-filter" className="crew-label">
            Filter crew
          </label>
          <input
            id="crew-filter"
            ref={input}
            type="search"
            className="crew-input"
            value={filter}
            autoComplete="off"
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {shown.length > 0 ? (
          <ul className="crew-list">
            {shown.map((p) => (
              <li key={p.name} className="crew-row">
                <div className="crew-person">
                  <span className="crew-name">{p.name}</span>
                  <span className="crew-role">{p.role}</span>
                </div>
                <RowMenu
                  person={p}
                  onRemove={() =>
                    setCrew((c) => c.filter((x) => x.name !== p.name))
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="crew-empty" role="status">
            <p>
              {crew.length === 0
                ? "No crew on the roster."
                : "No crew match your filter."}
            </p>
            {crew.length > 0 && (
              <button
                type="button"
                className="crew-clear"
                onClick={() => {
                  setFilter("");
                  input.current?.focus();
                }}
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
