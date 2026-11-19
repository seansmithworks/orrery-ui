import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input, Select, Switch } from "./kit";

const ZONES: Record<string, string> = {
  utc: "UTC",
  berlin: "Berlin",
  tokyo: "Tokyo",
};

export default function ProfileSettings() {
  const [saved, setSaved] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "var(--space-48) var(--space-24)",
        background: "var(--page)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: "var(--layout-measure)", margin: "0 auto" }}>
        <Card.Root render={<section />} aria-labelledby="profile-title">
          <Card.Header>
            <h1 id="profile-title" style={{ margin: 0 }}>
              Profile settings
            </h1>
          </Card.Header>
          <form
            onSubmit={submit}
            onChange={() => setSaved(false)}
            style={{ display: "contents" }}
          >
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
              <span role="status">{saved ? "Profile saved." : ""}</span>
              <Button variant="primary" type="submit">
                Save profile
              </Button>
            </Card.Footer>
          </form>
        </Card.Root>
      </div>
    </main>
  );
}
