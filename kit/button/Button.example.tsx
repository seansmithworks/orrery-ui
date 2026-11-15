// Golden example: the footer of an edit form. Cancel and Save, with Save showing progress while it works,
// and an undo icon in the dense toolbar above. Spacing is token variables only.
import { useEffect, useState } from "react";
import { Button, IconButton } from "../index";

function UndoGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 4L4 8l4 4M4 8h7a5 5 0 010 10H8" />
    </svg>
  );
}

export default function EditOrbitFooter() {
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState(2);

  useEffect(() => {
    if (!saving) return;
    const done = setTimeout(() => {
      setSaving(false);
      setEdits(0);
    }, 1200);
    return () => clearTimeout(done);
  }, [saving]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-16)",
      }}
    >
      {/* A dense toolbar of size s controls keeps --space-12 between them, so each keeps its 44px hit area. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-12)",
        }}
      >
        <IconButton
          variant="quiet"
          size="s"
          aria-label="Undo last edit"
          disabled={edits === 0 || saving}
          onClick={() => setEdits((n) => Math.max(0, n - 1))}
        >
          <UndoGlyph />
        </IconButton>
        <span style={{ color: "var(--text-muted)" }}>
          {edits === 0 ? "All changes saved" : `${edits} unsaved edits`}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-12)",
        }}
      >
        <Button variant="quiet" disabled={saving} onClick={() => setEdits(0)}>
          Discard edits
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={edits === 0}
          onClick={() => setSaving(true)}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
