// Golden example: pick the body a new chart follows. Nothing is chosen at first, so the trigger shows a
// placeholder. The form checks itself on submit (reportValidity): UI SDK's Field blocks the submit,
// focuses the first invalid control, and Field.Error match="valueMissing" says what to fix. Root gets
// `items` so the trigger shows the label, not the raw value. Spacing is token variables only.
import { useState, type FormEvent } from "react";
import { Button, Field, Select } from "../index";

const INNER = { mercury: "Mercury", venus: "Venus", mars: "Mars" };
const OUTER = { jupiter: "Jupiter", saturn: "Saturn", neptune: "Neptune" };
const ITEMS: Record<string, string> = { ...INNER, ...OUTER };

export default function NewChart() {
  const [made, setMade] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setMade(ITEMS[String(new FormData(form).get("body"))] ?? null);
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
      <Field.Root name="body">
        <Field.Label>Body</Field.Label>
        <Select.Root items={ITEMS} required onValueChange={() => setMade(null)}>
          <Select.Trigger placeholder="Choose a body" />
          <Select.Popup>
            <Select.Group>
              <Select.GroupLabel>Inner planets</Select.GroupLabel>
              {Object.entries(INNER).map(([value, label]) => (
                <Select.Item key={value} value={value}>
                  {label}
                </Select.Item>
              ))}
            </Select.Group>
            <Select.Separator />
            <Select.Group>
              <Select.GroupLabel>Outer planets</Select.GroupLabel>
              {Object.entries(OUTER).map(([value, label]) => (
                <Select.Item key={value} value={value}>
                  {label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Popup>
        </Select.Root>
        <Field.Description>
          The chart centres on this body and follows its orbit.
        </Field.Description>
        <Field.Error match="valueMissing">
          Choose a body for the chart to follow.
        </Field.Error>
      </Field.Root>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-12)",
        }}
      >
        <Button variant="primary" type="submit">
          Make chart
        </Button>
        <span role="status">{made ? `Chart made for ${made}.` : ""}</span>
      </div>
    </form>
  );
}
