import { useRef, useState, type KeyboardEvent } from "react";
import "./solution.css";

const TABS = [
  { id: "overview", label: "Overview", text: "Leads the docking checklist." },
  { id: "passes", label: "Passes", text: "Next close pass in four days." },
  { id: "history", label: "History", text: "Charted since March." },
];

export default function Solution() {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    let next = selected;
    if (e.key === "ArrowRight") next = (selected + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (selected - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setSelected(next);
    refs.current[next]?.focus();
  };

  return (
    <main className="crew-page">
      <section className="crew-card" aria-labelledby="crew-name">
        <header className="crew-head">
          <h1 id="crew-name" className="crew-name">Ada Okafor</h1>
          <p className="crew-role">Flight engineer, Orbit 7</p>
        </header>

        <div className="crew-tabs" role="tablist" aria-label="Crew member details" onKeyDown={onKeyDown}>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => { refs.current[i] = el; }}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={selected === i}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected === i ? 0 : -1}
              className="crew-tab"
              onClick={() => setSelected(i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {TABS.map((t, i) => (
          <div
            key={t.id}
            role="tabpanel"
            id={`panel-${t.id}`}
            aria-labelledby={`tab-${t.id}`}
            hidden={selected !== i}
            className="crew-panel"
          >
            <p>{t.text}</p>
          </div>
        ))}

        <footer className="crew-foot">
          <button type="button" className="btn btn-quiet">Remove from crew</button>
          <button type="button" className="btn btn-primary">Save changes</button>
        </footer>
      </section>
    </main>
  );
}
