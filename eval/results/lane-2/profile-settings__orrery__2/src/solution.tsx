import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input, Select, Switch } from "./kit";
import "./solution.css";

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
    <main className="profile-page">
      <div className="profile-page__inner">
        <Card.Root render={<section />} aria-labelledby="profile-title">
          <Card.Header>
            <h1 id="profile-title">Profile settings</h1>
          </Card.Header>
          <form
            className="profile-page__form"
            onSubmit={submit}
            onChange={() => setSaved(false)}
          >
            <Card.Body>
              <div className="profile-page__form">
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
              <div className="profile-page__actions">
                <Button variant="primary" type="submit">
                  Save profile
                </Button>
                <span role="status">{saved ? "Profile saved." : ""}</span>
              </div>
            </Card.Footer>
          </form>
        </Card.Root>
      </div>
    </main>
  );
}
