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
      <form className="ps-form" onSubmit={onSubmit}>
        <h1 className="ps-title">Profile settings</h1>

        <div className="ps-field">
          <label className="ps-label" htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            className="ps-input"
            type="text"
            value={name}
            aria-describedby="display-name-hint"
            onChange={(e) => { setName(e.target.value); touch(); }}
          />
          <p className="ps-hint" id="display-name-hint">Shown to your crew.</p>
        </div>

        <div className="ps-field">
          <label className="ps-label" htmlFor="time-zone">Time zone</label>
          <select
            id="time-zone"
            className="ps-select"
            required
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
          <span className="ps-label" id="orbits-label">Email me about new orbits</span>
          <button
            type="button"
            role="switch"
            className="ps-switch"
            aria-checked={emailOrbits}
            aria-labelledby="orbits-label"
            onClick={() => { setEmailOrbits(!emailOrbits); touch(); }}
          >
            <span className="ps-track"><span className="ps-thumb" /></span>
          </button>
        </div>

        <button type="submit" className="ps-button">Save profile</button>

        <p className="ps-status" role="status" aria-live="polite">
          {saved ? "Profile saved." : ""}
        </p>
      </form>
    </main>
  );
}
