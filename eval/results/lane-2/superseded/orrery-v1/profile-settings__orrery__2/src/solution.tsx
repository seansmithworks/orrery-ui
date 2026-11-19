import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select, Switch } from "./kit";

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
        background: "var(--page)",
        color: "var(--text)",
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "var(--space-24)",
      }}
    >
      <form
        onSubmit={submit}
        onChange={() => setSaved(false)}
        aria-labelledby="profile-title"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-20)",
          maxWidth: "var(--layout-measure)",
          margin: "0 auto",
        }}
      >
        <h1 id="profile-title" style={{ margin: 0 }}>
          Profile settings
        </h1>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-12)",
          }}
        >
          <Button variant="primary" type="submit">
            Save profile
          </Button>
          <span role="status">{saved ? "Profile saved." : ""}</span>
        </div>
      </form>
    </main>
  );
}
