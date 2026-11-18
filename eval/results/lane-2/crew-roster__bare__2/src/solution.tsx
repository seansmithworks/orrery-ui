import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import "./solution.css";

type Person = { id: number; name: string; role: string };

const INITIAL: Person[] = [
  { id: 1, name: "Ada Okafor", role: "Flight engineer" },
  { id: 2, name: "Bo Lindqvist", role: "Navigator" },
  { id: 3, name: "Chen Wei", role: "Pilot" },
  { id: 4, name: "Dara Moss", role: "Medic" },
  { id: 5, name: "Eli Hart", role: "Comms" },
];

const ACTIONS = ["Edit", "Reassign", "Remove"] as const;

function Row({
  person,
  open,
  onToggle,
  onClose,
  onAction,
}: {
  person: Person;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAction: (a: (typeof ACTIONS)[number]) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  const onMenuKey = (e: KeyboardEvent) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("button") ?? [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      btnRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") {
      onClose();
    }
  };

  return (
    <li className="crew-row">
      <div className="crew-info">
        <span className="crew-name">{person.name}</span>
        <span className="crew-role">{person.role}</span>
      </div>
      <div className="crew-actions">
        <button
          ref={btnRef}
          type="button"
          className="crew-actions-btn"
          aria-label={`Actions for ${person.name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={onToggle}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <circle cx="3" cy="8" r="1.5" fill="currentColor" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="13" cy="8" r="1.5" fill="currentColor" />
          </svg>
        </button>
        {open && (
          <ul
            ref={menuRef}
            id={menuId}
            className="crew-menu"
            role="menu"
            aria-label={`Actions for ${person.name}`}
            onKeyDown={onMenuKey}
          >
            {ACTIONS.map((a) => (
              <li key={a} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="crew-menu-item"
                  onClick={() => {
                    onAction(a);
                    if (a !== "Remove") {
                      onClose();
                      btnRef.current?.focus();
                    }
                  }}
                >
                  {a}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export default function CrewRoster() {
  const [crew, setCrew] = useState<Person[]>(INITIAL);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const q = query.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(q));

  const remove = (id: number) => {
    setOpenId(null);
    setCrew((c) => c.filter((p) => p.id !== id));
    // the removed row's button disappears; keep focus somewhere sensible
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <main className="crew-page">
      <div className="crew-panel">
        <h1 className="crew-heading">Crew</h1>

        <div className="crew-field">
          <label htmlFor={inputId} className="crew-label">
            Filter crew
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            className="crew-input"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {visible.length > 0 ? (
          <ul className="crew-list">
            {visible.map((p) => (
              <Row
                key={p.id}
                person={p}
                open={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                onClose={() => setOpenId((cur) => (cur === p.id ? null : cur))}
                onAction={(a) => a === "Remove" && remove(p.id)}
              />
            ))}
          </ul>
        ) : (
          <div className="crew-empty" role="status">
            <p>{crew.length === 0 && !q ? "No crew on the roster." : "No crew match your filter."}</p>
            <button
              type="button"
              className="crew-clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
