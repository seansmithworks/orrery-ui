// Golden example: confirm deleting an orbit. One optional choice with a hint, and one tick the person must give,
// which says what to do in words when it is missing. Spacing is token variables only.
import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field } from "../index";

const MISSING = "Tick this box to confirm. Orbit 7 cannot be restored.";

export default function ConfirmDeleteOrbit() {
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(understood ? null : MISSING);
    setDeleted(understood);
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-20)",
      }}
    >
      <Field.Root name="deleteCharts">
        <Field.Label>
          <Checkbox defaultChecked />
          Also delete its 12 charts
        </Field.Label>
        <Field.Description>
          Charts that other dashboards use are kept.
        </Field.Description>
      </Field.Root>
      <Field.Root name="understood" invalid={error !== null}>
        <Field.Label>
          <Checkbox
            required
            checked={understood}
            onCheckedChange={(checked) => {
              setUnderstood(checked);
              if (checked) setError(null);
              setDeleted(false);
            }}
          />
          I understand this cannot be undone
        </Field.Label>
        <Field.Error match={error !== null}>{error}</Field.Error>
      </Field.Root>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-12)",
        }}
      >
        <Button variant="primary" type="submit">
          Delete orbit
        </Button>
        <span role="status">{deleted ? "Orbit 7 deleted." : ""}</span>
      </div>
    </form>
  );
}
