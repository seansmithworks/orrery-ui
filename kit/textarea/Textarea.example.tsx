// Golden example: a note on a support request. The note explains what helps up front and says what to fix
// in words when it is empty. Spacing is token variables only.
import { useState, type FormEvent } from "react";
import { Button, Field, Textarea } from "../index";

export default function SupportNote() {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = note.trim()
      ? null
      : "Write a few words about what went wrong.";
    setError(problem);
    setSent(!problem);
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
      <Field.Root name="note" invalid={error !== null}>
        <Field.Label>What happened</Field.Label>
        <Textarea
          rows={4}
          value={note}
          onValueChange={(value) => {
            setNote(value);
            setSent(false);
          }}
        />
        <Field.Description>
          Say what you clicked and what you expected. We read every note.
        </Field.Description>
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
          Send note
        </Button>
        <span role="status">{sent ? "Note sent." : ""}</span>
      </div>
    </form>
  );
}
