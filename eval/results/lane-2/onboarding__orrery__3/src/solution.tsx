import { useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Field, Input, Radio } from "./kit";

const TEAMS = ["Solo", "Small crew (2 to 10)", "Large crew (11 or more)"];

const column = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-20)",
} as const;

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [team, setTeam] = useState(TEAMS[0]);
  const [agreed, setAgreed] = useState(false);
  const [created, setCreated] = useState(false);

  function continueFromDetails(event: FormEvent) {
    event.preventDefault();
    const n = name.trim() === "" ? "Enter your name." : null;
    const e = email.includes("@") ? null : "Enter a valid email.";
    setNameError(n);
    setEmailError(e);
    if (!n && !e) setStep(2);
  }

  const titles = ["Your details", "Your team", "Confirm"];

  return (
    <main
      style={{
        maxWidth: "var(--layout-measure, 40rem)",
        margin: "0 auto",
        padding: "var(--space-24, 24px) var(--space-16)",
      }}
    >
      <Card.Root render={<section />} aria-labelledby="signup-title">
        <Card.Header>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Step {step} of 3
          </p>
          <h2 id="signup-title" style={{ margin: 0 }}>
            {titles[step - 1]}
          </h2>
        </Card.Header>

        {step === 1 && (
          <form noValidate onSubmit={continueFromDetails}>
            <Card.Body>
              <div style={column}>
                <Field.Root name="name" invalid={nameError !== null}>
                  <Field.Label>Full name</Field.Label>
                  <Input
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                  />
                  <Field.Error match={nameError !== null}>{nameError}</Field.Error>
                </Field.Root>
                <Field.Root name="email" invalid={emailError !== null}>
                  <Field.Label>Email</Field.Label>
                  <Input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                  />
                  <Field.Error match={emailError !== null}>
                    {emailError}
                  </Field.Error>
                </Field.Root>
              </div>
            </Card.Body>
            <Card.Footer>
              <Button variant="primary" type="submit">
                Continue
              </Button>
            </Card.Footer>
          </form>
        )}

        {step === 2 && (
          <>
            <Card.Body>
              <Field.Root>
                <Field.Label>Team size</Field.Label>
                <Radio.Group name="team" value={team} onValueChange={setTeam}>
                  {TEAMS.map((t) => (
                    <Radio.Item key={t} value={t}>
                      {t}
                    </Radio.Item>
                  ))}
                </Radio.Group>
              </Field.Root>
            </Card.Body>
            <Card.Footer>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Continue
              </Button>
            </Card.Footer>
          </>
        )}

        {step === 3 && (
          <>
            <Card.Body>
              <div style={column}>
                <dl
                  style={{
                    margin: 0,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    columnGap: "var(--space-16)",
                    rowGap: "var(--space-8)",
                  }}
                >
                  <dt style={{ color: "var(--text-muted)" }}>Name</dt>
                  <dd style={{ margin: 0 }}>{name}</dd>
                  <dt style={{ color: "var(--text-muted)" }}>Email</dt>
                  <dd style={{ margin: 0 }}>{email}</dd>
                  <dt style={{ color: "var(--text-muted)" }}>Team</dt>
                  <dd style={{ margin: 0 }}>{team}</dd>
                </dl>
                <Field.Root>
                  <Field.Label>
                    <Checkbox
                      checked={agreed}
                      onCheckedChange={setAgreed}
                      disabled={created}
                    />
                    I agree to the terms
                  </Field.Label>
                </Field.Root>
                <p role="status" style={{ margin: 0 }}>
                  {created ? "Account created." : ""}
                </p>
              </div>
            </Card.Body>
            <Card.Footer>
              <Button
                variant="secondary"
                disabled={created}
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!agreed || created}
                onClick={() => agreed && setCreated(true)}
              >
                Create account
              </Button>
            </Card.Footer>
          </>
        )}
      </Card.Root>
    </main>
  );
}
