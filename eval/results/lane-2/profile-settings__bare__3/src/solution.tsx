import { useState, type FormEvent } from "react";
import "./solution.css";

export default function ProfileSettings() {
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [emailOrbits, setEmailOrbits] = useState(false);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  function touch() {
    setSaved(false);
  }

  return (
    <main className="ps-page">
      <form className="ps-card" onSubmit={onSubmit}>
        <h1 className="ps-title">Profile settings</h1>

        <div className="ps-field">
          <label className="ps-label" htmlFor="ps-name">Display name</label>
          <input
            id="ps-name"
            className="ps-control"
            type="text"
            value={name}
            aria-describedby="ps-name-hint"
            onChange={(e) => { setName(e.target.value); touch(); }}
          />
          <p className="ps-hint" id="ps-name-hint">Shown to your crew.</p>
        </div>

        <div className="ps-field">
          <label className="ps-label" htmlFor="ps-zone">Time zone</label>
          <select
            id="ps-zone"
            className="ps-control"
            value={zone}
            onChange={(e) => { setZone(e.target.value); touch(); }}
          >
            <option value="" disabled>Choose a time zone</option>
            <option value="utc">UTC</option>
            <option value="berlin">Berlin</option>
            <option value="tokyo">Tokyo</option>
          </select>
        </div>

        <div className="ps-switch-row">
          <span className="ps-label" id="ps-orbits-label">Email me about new orbits</span>
          <button
            type="button"
            role="switch"
            aria-checked={emailOrbits}
            aria-labelledby="ps-orbits-label"
            className="ps-switch"
            onClick={() => { setEmailOrbits((v) => !v); touch(); }}
          >
            <span className="ps-thumb" />
          </button>
        </div>

        <div className="ps-actions">
          <button type="submit" className="ps-primary">Save profile</button>
          <p className="ps-status" role="status" aria-live="polite">
            {saved ? "Profile saved." : ""}
          </p>
        </div>
      </form>
    </main>
  );
}
