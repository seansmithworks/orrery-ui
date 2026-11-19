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
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [team, setTeam] = useState(TEAMS[0]);
  const [agreed, setAgreed] = useState(false);
  const [created, setCreated] = useState(false);

  function submitDetails(event: FormEvent) {
    event.preventDefault();
    const n = name.trim() ? "" : "Enter your name.";
    const e = email.includes("@") ? "" : "Enter a valid email.";
    setNameError(n);
    setEmailError(e);
    if (!n && !e) setStep(2);
  }

  function create(event: FormEvent) {
    event.preventDefault();
    if (agreed) setCreated(true);
  }

  const titles = ["Your details", "Your team", "Confirm"];

  return (
    <main
      style={{
        boxSizing: "border-box",
        minHeight: "100vh",
        padding: "var(--space-48) var(--space-24)",
        background: "var(--page)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
        <Card.Root render={<section />} aria-labelledby="step-title">
          <Card.Header>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              Step {step} of 3
            </p>
            <h1 id="step-title">{titles[step - 1]}</h1>
          </Card.Header>

          {step === 1 && (
            <form noValidate onSubmit={submitDetails} style={column}>
              <Card.Body>
                <Field.Root name="name" invalid={!!nameError}>
                  <Field.Label>Full name</Field.Label>
                  <Input
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Field.Error match={!!nameError}>{nameError}</Field.Error>
                </Field.Root>
                <Field.Root name="email" invalid={!!emailError}>
                  <Field.Label>Email</Field.Label>
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Field.Error match={!!emailError}>{emailError}</Field.Error>
                </Field.Root>
              </Card.Body>
              <Card.Footer>
                <Button variant="primary" type="submit">
                  Continue
                </Button>
              </Card.Footer>
            </form>
          )}

          {step === 2 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setStep(3);
              }}
              style={column}
            >
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
                <Button variant="primary" type="submit">
                  Continue
                </Button>
              </Card.Footer>
            </form>
          )}

          {step === 3 && (
            <form noValidate onSubmit={create} style={column}>
              <Card.Body>
                <dl
                  style={{
                    margin: 0,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "var(--space-8) var(--space-16)",
                  }}
                >
                  <dt style={{ color: "var(--text-muted)" }}>Name</dt>
                  <dd style={{ margin: 0 }}>{name.trim()}</dd>
                  <dt style={{ color: "var(--text-muted)" }}>Email</dt>
                  <dd style={{ margin: 0 }}>{email.trim()}</dd>
                  <dt style={{ color: "var(--text-muted)" }}>Team</dt>
                  <dd style={{ margin: 0 }}>{team}</dd>
                </dl>
                <Field.Root>
                  <Field.Label>
                    <Checkbox
                      name="terms"
                      checked={agreed}
                      onCheckedChange={setAgreed}
                      disabled={created}
                    />
                    I agree to the terms
                  </Field.Label>
                </Field.Root>
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
                  type="submit"
                  disabled={!agreed || created}
                >
                  Create account
                </Button>
              </Card.Footer>
              <p role="status" style={{ margin: 0 }}>
                {created ? "Account created." : ""}
              </p>
            </form>
          )}
        </Card.Root>
      </div>
    </main>
  );
}
