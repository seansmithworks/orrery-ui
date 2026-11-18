import { useEffect, useRef, useState } from "react";
import "./solution.css";

const SECTIONS = ["General", "Notifications", "Danger zone"] as const;
type Section = (typeof SECTIONS)[number];
const ROLES = ["Viewer", "Editor", "Admin"];

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `sw-${slug(label)}`;
  return (
    <div className="ws-switch-row">
      <span id={id}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        className="ws-switch"
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("General");
  const [name, setName] = useState("Orbit Lab");
  const [role, setRole] = useState("Editor");
  const [saved, setSaved] = useState(false);
  const [weekly, setWeekly] = useState(true);
  const [mentions, setMentions] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  function close() {
    setConfirming(false);
    deleteBtnRef.current?.focus();
  }

  function onTabKey(e: React.KeyboardEvent, i: number) {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % SECTIONS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + SECTIONS.length) % SECTIONS.length;
    else return;
    e.preventDefault();
    setSection(SECTIONS[n]);
    document.getElementById(`tab-${slug(SECTIONS[n])}`)?.focus();
  }

  return (
    <div className="ws">
      <div className="ws-inner">
        <h1>Workspace settings</h1>

        <div className="ws-tabs" role="tablist" aria-label="Settings sections">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              type="button"
              role="tab"
              id={`tab-${slug(s)}`}
              aria-selected={section === s}
              aria-controls={`panel-${slug(s)}`}
              tabIndex={section === s ? 0 : -1}
              className="ws-tab"
              onClick={() => setSection(s)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {s}
            </button>
          ))}
        </div>

        <div
          className="ws-panel"
          role="tabpanel"
          id={`panel-${slug(section)}`}
          aria-labelledby={`tab-${slug(section)}`}
        >
          {section === "General" && (
            <>
              <div className="ws-field">
                <label className="ws-label" htmlFor="ws-name">
                  Workspace name
                </label>
                <input
                  id="ws-name"
                  className="ws-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                />
              </div>
              <fieldset>
                <legend>Default role for new members</legend>
                <div className="ws-radios">
                  {ROLES.map((r) => (
                    <label key={r} className="ws-radio">
                      <input
                        type="radio"
                        name="default-role"
                        value={r}
                        checked={role === r}
                        onChange={() => {
                          setRole(r);
                          setSaved(false);
                        }}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="ws-row">
                <button
                  type="button"
                  className="ws-btn ws-btn-primary"
                  onClick={() => setSaved(true)}
                >
                  Save changes
                </button>
                <p className="ws-status" role="status">
                  {saved ? "Settings saved." : ""}
                </p>
              </div>
            </>
          )}

          {section === "Notifications" && (
            <>
              <Switch label="Weekly summary email" checked={weekly} onChange={setWeekly} />
              <Switch label="Mentions" checked={mentions} onChange={setMentions} />
            </>
          )}

          {section === "Danger zone" && (
            <>
              <p style={{ margin: 0 }}>
                Deleting this workspace is permanent and cannot be reversed.
              </p>
              <div className="ws-row">
                <button
                  type="button"
                  ref={deleteBtnRef}
                  className="ws-btn ws-btn-danger"
                  onClick={() => setConfirming(true)}
                >
                  Delete workspace
                </button>
                <p className="ws-status" role="status">
                  {deleted ? "Workspace deleted." : ""}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {confirming && (
        <div className="ws-backdrop">
          <div
            className="ws-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ws-modal-title"
            aria-describedby="ws-modal-desc"
          >
            <h2 id="ws-modal-title">Delete Orbit Lab?</h2>
            <p id="ws-modal-desc">
              This removes all projects and members. It cannot be undone.
            </p>
            <div className="ws-row">
              <button type="button" ref={cancelRef} className="ws-btn" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="ws-btn ws-btn-primary"
                onClick={() => {
                  setDeleted(true);
                  close();
                }}
              >
                Delete workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
