import { useId, useState, type FormEvent } from "react";
import { Button, Card, Field, Input, Select, Switch } from "./kit";

const ZONES: Record<string, string> = {
  utc: "UTC",
  berlin: "Berlin",
  tokyo: "Tokyo",
};

export default function ProfileSettings() {
  const [saved, setSaved] = useState(false);
  const titleId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "var(--space-32) var(--space-16)",
        background: "var(--page)",
        color: "var(--text)",
      }}
    >
      <div style={{ maxWidth: "var(--layout-measure)", margin: "0 auto" }}>
        <form onSubmit={submit} onChange={() => setSaved(false)}>
          <Card.Root render={<section />} aria-labelledby={titleId}>
            <Card.Header>
              <h1 id={titleId}>Profile settings</h1>
            </Card.Header>
            <Card.Body>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-20)",
                }}
              >
                <Field.Root name="displayName">
                  <Field.Label>Display name</Field.Label>
                  <Input autoComplete="nickname" />
                  <Field.Description>Shown to your crew.</Field.Description>
                </Field.Root>
                <Field.Root name="timeZone">
                  <Field.Label>Time zone</Field.Label>
                  <Select.Root items={ZONES} onValueChange={() => setSaved(false)}>
                    <Select.Trigger placeholder="Choose a time zone" />
                    <Select.Popup>
                      {Object.entries(ZONES).map(([value, label]) => (
                        <Select.Item key={value} value={value}>
                          {label}
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>
                    <Switch name="orbitEmails" />
                    Email me about new orbits
                  </Field.Label>
                </Field.Root>
              </div>
            </Card.Body>
            <Card.Footer>
              <span role="status" style={{ color: "var(--text-muted)" }}>
                {saved ? "Profile saved." : ""}
              </span>
              <Button variant="primary" type="submit">
                Save profile
              </Button>
            </Card.Footer>
          </Card.Root>
        </form>
      </div>
    </main>
  );
}
