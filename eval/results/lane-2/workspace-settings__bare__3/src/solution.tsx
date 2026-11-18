import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import "./solution.css";

const SECTIONS = ["General", "Notifications", "Danger zone"] as const;
const ROLES = ["Viewer", "Editor", "Admin"] as const;

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="os-row">
      <span id={`sw-${label}`} className="os-row-label">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`sw-${label}`}
        className="os-switch"
        onClick={() => onChange(!checked)}
      >
        <span className="os-switch-thumb" />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("General");
  const [name, setName] = useState("Orbit Lab");
  const [role, setRole] = useState<(typeof ROLES)[number]>("Editor");
  const [saved, setSaved] = useState(false);
  const [weekly, setWeekly] = useState(true);
  const [mentions, setMentions] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const deleteBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (confirming) cancelBtn.current?.focus();
  }, [confirming]);

  const closeModal = () => {
    setConfirming(false);
    deleteBtn.current?.focus();
  };

  const onDialogKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeModal();
    } else if (e.key === "Tab") {
      const f = dialog.current?.querySelectorAll<HTMLElement>("button");
      if (!f || !f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onTabKey = (e: KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % SECTIONS.length;
    else if (e.key === "ArrowLeft") n = (i + SECTIONS.length - 1) % SECTIONS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = SECTIONS.length - 1;
    if (n >= 0) {
      e.preventDefault();
      setSection(SECTIONS[n]);
      tabRefs.current[n]?.focus();
    }
  };

  return (
    <div className="os-page">
      <main className="os-main">
        <h1 className="os-title">Workspace settings</h1>

        <div role="tablist" aria-label="Settings sections" className="os-tabs">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${i}`}
              aria-selected={section === s}
              aria-controls={`panel-${i}`}
              tabIndex={section === s ? 0 : -1}
              className="os-tab"
              onClick={() => setSection(s)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {s}
            </button>
          ))}
        </div>

        {SECTIONS.map((s, i) => (
          <section
            key={s}
            role="tabpanel"
            id={`panel-${i}`}
            aria-labelledby={`tab-${i}`}
            hidden={section !== s}
            className="os-panel"
          >
            {s === "General" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSaved(true);
                }}
              >
                <div className="os-field">
                  <label htmlFor="ws-name" className="os-label">
                    Workspace name
                  </label>
                  <input
                    id="ws-name"
                    className="os-input"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSaved(false);
                    }}
                  />
                </div>
                <fieldset className="os-field os-fieldset">
                  <legend className="os-label">Default role for new members</legend>
                  <div className="os-radios">
                    {ROLES.map((r) => (
                      <label key={r} className="os-radio">
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
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="os-actions">
                  <button type="submit" className="os-btn os-btn-primary">
                    Save changes
                  </button>
                  <p role="status" className="os-status">
                    {saved ? "Settings saved." : ""}
                  </p>
                </div>
              </form>
            )}

            {s === "Notifications" && (
              <div className="os-list">
                <Switch label="Weekly summary email" checked={weekly} onChange={setWeekly} />
                <Switch label="Mentions" checked={mentions} onChange={setMentions} />
              </div>
            )}

            {s === "Danger zone" && (
              <div className="os-danger">
                <p className="os-text">
                  Deleting this workspace is permanent and cannot be reversed.
                </p>
                <div className="os-actions">
                  <button
                    ref={deleteBtn}
                    type="button"
                    className="os-btn os-btn-danger"
                    onClick={() => setConfirming(true)}
                  >
                    Delete workspace
                  </button>
                  <p role="status" className="os-status">
                    {deleted ? "Workspace deleted." : ""}
                  </p>
                </div>
              </div>
            )}
          </section>
        ))}
      </main>

      {confirming && (
        <div className="os-backdrop">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dlg-title"
            aria-describedby="dlg-desc"
            className="os-dialog"
            onKeyDown={onDialogKey}
          >
            <h2 id="dlg-title" className="os-dialog-title">
              Delete Orbit Lab?
            </h2>
            <p id="dlg-desc" className="os-text">
              This removes all projects and members. It cannot be undone.
            </p>
            <div className="os-dialog-actions">
              <button
                ref={cancelBtn}
                type="button"
                className="os-btn"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="os-btn os-btn-danger"
                onClick={() => {
                  setDeleted(true);
                  closeModal();
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
