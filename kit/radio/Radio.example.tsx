// Golden example: choose how an orbit's alerts arrive. One required choice among three, the group named by its
// label and described by its hint. The form checks itself on submit (reportValidity): UI SDK's Field turns a
// missing choice into the valueMissing error under the group, and the submit goes no further. Spacing is token
// variables only.
import { useState, type FormEvent } from "react";
import { Button, Field, Radio } from "../index";

export default function ChooseAlertChannel() {
  const [saved, setSaved] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const channel = new FormData(event.currentTarget).get("channel");
    setSaved(`Alerts by ${channel}.`);
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
      <Field.Root>
        <Field.Label>Alerts for Orbit 7</Field.Label>
        <Field.Description>
          Close passes and eclipses are always included.
        </Field.Description>
        <Radio.Group name="channel" required>
          <Radio.Item value="email">Email</Radio.Item>
          <Radio.Item value="sms">Text message</Radio.Item>
          <Radio.Item value="none">Do not alert me</Radio.Item>
        </Radio.Group>
        <Field.Error match="valueMissing">
          Choose how to receive alerts.
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
          Save alerts
        </Button>
        <span role="status">{saved}</span>
      </div>
    </form>
  );
}
