import { useEffect, useRef, useState } from "react";
import "./solution.css";

const INITIAL = [
  { name: "Ada Okafor", role: "Flight engineer" },
  { name: "Bo Lindqvist", role: "Navigator" },
  { name: "Chen Wei", role: "Pilot" },
  { name: "Dara Moss", role: "Medic" },
  { name: "Eli Hart", role: "Comms" },
];

const ACTIONS = ["Edit", "Reassign", "Remove"] as const;

export default function Crew() {
  const [crew, setCrew] = useState(INITIAL);
  const [query, setQuery] = useState("");
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const q = query.trim().toLowerCase();
  const visible = crew.filter((p) => p.name.toLowerCase().includes(q));

  useEffect(() => {
    if (!openFor) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.("[data-menu-root]")) setOpenFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerRefs.current[openFor]?.focus();
        setOpenFor(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openFor]);

  const choose = (name: string, action: (typeof ACTIONS)[number]) => {
    setOpenFor(null);
    if (action === "Remove") {
      setCrew((c) => c.filter((p) => p.name !== name));
      setStatus(`${name} removed.`);
      inputRef.current?.focus();
    } else {
      setStatus(`${action} selected for ${name}.`);
      triggerRefs.current[name]?.focus();
    }
  };

  return (
    <div className="crew-page">
      <main className="crew">
        <h1>Crew</h1>
        <label className="crew-field">
          <span>Filter crew</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>

        {visible.length > 0 ? (
          <ul className="crew-list">
            {visible.map((p) => (
              <li key={p.name} className="crew-row">
                <div className="crew-info">
                  <span className="crew-name">{p.name}</span>
                  <span className="crew-role">{p.role}</span>
                </div>
                <div className="crew-menu-root" data-menu-root>
                  <button
                    type="button"
                    className="crew-actions"
                    ref={(el) => {
                      triggerRefs.current[p.name] = el;
                    }}
                    aria-label={`Actions for ${p.name}`}
                    aria-haspopup="true"
                    aria-expanded={openFor === p.name}
                    onClick={() => setOpenFor(openFor === p.name ? null : p.name)}
                  >
                    <span aria-hidden="true">⋯</span>
                  </button>
                  {openFor === p.name && (
                    <ul className="crew-menu" aria-label={`Actions for ${p.name}`}>
                      {ACTIONS.map((a) => (
                        <li key={a}>
                          <button type="button" onClick={() => choose(p.name, a)}>
                            {a}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="crew-empty">
            <p>No crew match your filter.</p>
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
        <p className="crew-status" role="status" aria-live="polite">
          {status}
        </p>
      </main>
    </div>
  );
}
