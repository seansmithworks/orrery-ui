import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import "./solution.css";

const SECTIONS = ["General", "Notifications", "Danger zone"] as const;
type Section = (typeof SECTIONS)[number];
const ROLES = ["Viewer", "Editor", "Admin"] as const;

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
  return (
    <div className="ws-row">
      <span id={`sw-${slug(label)}`} className="ws-row-label">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`sw-${slug(label)}`}
        className="ws-switch"
        onClick={() => onChange(!checked)}
      >
        <span className="ws-switch-thumb" />
      </button>
    </div>
  );
}

function ConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
    } else if (e.key === "Tab") {
      const els = dialogRef.current?.querySelectorAll<HTMLElement>("button");
      if (!els || els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="ws-backdrop" onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        className="ws-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-modal-title"
        aria-describedby="ws-modal-desc"
      >
        <h2 id="ws-modal-title" className="ws-modal-title">
          Delete Orbit Lab?
        </h2>
        <p id="ws-modal-desc" className="ws-text">
          This removes all projects and members. It cannot be undone.
        </p>
        <div className="ws-actions">
          <button
            ref={cancelRef}
            type="button"
            className="ws-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ws-btn ws-btn-primary"
            onClick={onConfirm}
          >
            Delete workspace
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("General");
  const [name, setName] = useState("Orbit Lab");
  const [role, setRole] = useState<(typeof ROLES)[number]>("Editor");
  const [weekly, setWeekly] = useState(true);
  const [mentions, setMentions] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const closeModal = () => {
    setConfirming(false);
    deleteBtnRef.current?.focus();
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % SECTIONS.length;
    else if (e.key === "ArrowLeft")
      next = (i - 1 + SECTIONS.length) % SECTIONS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SECTIONS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setSection(SECTIONS[next]);
      tabRefs.current[SECTIONS[next]]?.focus();
    }
  };

  return (
    <div className="ws-page">
      <main className="ws-main">
        <h1 className="ws-heading">Workspace settings</h1>

        <div role="tablist" aria-label="Settings sections" className="ws-tabs">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              ref={(el) => {
                tabRefs.current[s] = el;
              }}
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

        {SECTIONS.map((s) => (
          <section
            key={s}
            role="tabpanel"
            id={`panel-${slug(s)}`}
            aria-labelledby={`tab-${slug(s)}`}
            hidden={section !== s}
            className="ws-panel"
          >
            {s === "General" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSaved(true);
                }}
              >
                <div className="ws-field">
                  <label htmlFor="ws-name" className="ws-label">
                    Workspace name
                  </label>
                  <input
                    id="ws-name"
                    type="text"
                    className="ws-input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSaved(false);
                    }}
                  />
                </div>

                <fieldset className="ws-fieldset">
                  <legend className="ws-label">Default role for new members</legend>
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
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="ws-actions ws-actions-start">
                  <button type="submit" className="ws-btn ws-btn-primary">
                    Save changes
                  </button>
                  <p role="status" className="ws-status">
                    {saved ? "Settings saved." : ""}
                  </p>
                </div>
              </form>
            )}

            {s === "Notifications" && (
              <div className="ws-list">
                <Switch
                  label="Weekly summary email"
                  checked={weekly}
                  onChange={setWeekly}
                />
                <Switch
                  label="Mentions"
                  checked={mentions}
                  onChange={setMentions}
                />
              </div>
            )}

            {s === "Danger zone" && (
              <div>
                <p className="ws-text">
                  Deleting this workspace is permanent and cannot be reversed.
                </p>
                <div className="ws-actions ws-actions-start">
                  <button
                    ref={deleteBtnRef}
                    type="button"
                    className="ws-btn ws-btn-danger"
                    onClick={() => setConfirming(true)}
                  >
                    Delete workspace
                  </button>
                </div>
              </div>
            )}
          </section>
        ))}

        {/* Deletion status lives outside the panels so it stays visible. */}
        <p role="status" className="ws-status ws-status-page">
          {deleted ? "Workspace deleted." : ""}
        </p>
      </main>

      {confirming && (
        <ConfirmModal
          onCancel={closeModal}
          onConfirm={() => {
            setDeleted(true);
            closeModal();
          }}
        />
      )}
    </div>
  );
}
