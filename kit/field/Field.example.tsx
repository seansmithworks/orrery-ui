// Golden example: sign in with an emailed link. The workspace is read-only, the email field explains its
// format up front and says what to fix in words when the address is incomplete. Spacing is token variables only.
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "../index";

const check = (email: string) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    ? null
    : "Add the part after the @, for example ada@orbit.dev.";

export default function SignInWithLink() {
  const [email, setEmail] = useState("ada@orbit");
  const [error, setError] = useState<string | null>(check("ada@orbit"));
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = check(email);
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
      <Field.Root name="workspace">
        <Field.Label>Workspace</Field.Label>
        <Input readOnly value="orbit-lab" />
        <Field.Description>
          You were invited to this workspace.
        </Field.Description>
      </Field.Root>
      <Field.Root name="email" invalid={error !== null}>
        <Field.Label>Email</Field.Label>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSent(false);
          }}
        />
        <Field.Description>
          We send a sign-in link to this address. No password needed.
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
          Send sign-in link
        </Button>
        <span role="status">{sent ? `Link sent to ${email}.` : ""}</span>
      </div>
    </form>
  );
}
