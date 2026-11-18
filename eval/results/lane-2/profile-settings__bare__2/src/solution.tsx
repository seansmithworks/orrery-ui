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
    <div className="ps-page">
      <form className="ps-form" onSubmit={onSubmit}>
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
          <p id="ps-name-hint" className="ps-hint">Shown to your crew.</p>
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

        <label className="ps-switch-row" htmlFor="ps-orbits">
          <input
            id="ps-orbits"
            className="ps-switch"
            type="checkbox"
            role="switch"
            checked={emailOrbits}
            onChange={(e) => { setEmailOrbits(e.target.checked); touch(); }}
          />
          <span className="ps-switch-text">Email me about new orbits</span>
        </label>

        <div className="ps-actions">
          <button type="submit" className="ps-button">Save profile</button>
          <p className="ps-status" role="status" aria-live="polite">
            {saved ? "Profile saved." : ""}
          </p>
        </div>
      </form>
    </div>
  );
}
