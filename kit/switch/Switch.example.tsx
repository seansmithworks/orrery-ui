// Golden example: chart settings. Two settings that stay on or off, each named for what turns on, saved with the
// form. An on switch submits its name with the value "on"; an off switch submits nothing, as a native checkbox.
// Spacing is token variables only.
import { useState, type FormEvent } from "react";
import { Button, Field, Switch } from "../index";

export default function ChartSettings() {
  const [saved, setSaved] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-20)",
      }}
    >
      <Field.Root>
        <Field.Label>
          <Switch name="gridLines" defaultChecked />
          Show grid lines
        </Field.Label>
      </Field.Root>
      <Field.Root>
        <Field.Label>
          <Switch name="orbitEmails" />
          Email me when an orbit changes
        </Field.Label>
        <Field.Description>At most one email a day.</Field.Description>
      </Field.Root>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-12)",
        }}
      >
        <Button variant="primary" type="submit">
          Save settings
        </Button>
        <span role="status">{saved ? "Settings saved." : ""}</span>
      </div>
    </form>
  );
}
