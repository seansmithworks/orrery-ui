import { useState, type KeyboardEvent } from "react";
import "./solution.css";

const TABS = [
  { id: "overview", label: "Overview", text: "Leads the docking checklist." },
  { id: "passes", label: "Passes", text: "Next close pass in four days." },
  { id: "history", label: "History", text: "Charted since March." },
];

export default function Solution() {
  const [active, setActive] = useState(0);

  const onKey = (e: KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    else return;
    e.preventDefault();
    setActive(n);
    document.getElementById(`tab-${TABS[n].id}`)?.focus();
  };

  return (
    <main className="page">
      <section className="card" aria-labelledby="crew-name">
        <div className="card-head">
          <h1 className="card-name" id="crew-name">Ada Okafor</h1>
          <p className="card-role">Flight engineer, Orbit 7</p>
        </div>
        <div className="tabs" role="tablist" aria-label="Crew member details">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              className="tab"
              aria-selected={active === i}
              aria-controls={`panel-${t.id}`}
              tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {TABS.map((t, i) => (
          <p
            key={t.id}
            role="tabpanel"
            id={`panel-${t.id}`}
            aria-labelledby={`tab-${t.id}`}
            className="panel"
            hidden={active !== i}
          >
            {t.text}
          </p>
        ))}
        <div className="footer">
          <button type="button" className="btn btn-quiet">Remove from crew</button>
          <button type="button" className="btn btn-primary">Save changes</button>
        </div>
      </section>
    </main>
  );
}
