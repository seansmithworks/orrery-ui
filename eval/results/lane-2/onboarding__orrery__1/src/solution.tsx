import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Field, Input, Radio } from "./kit";

const TEAMS = [
  { value: "Solo", label: "Solo" },
  { value: "Small crew", label: "Small crew (2 to 10)" },
  { value: "Large crew", label: "Large crew (11 or more)" },
];

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [team, setTeam] = useState("Solo");
  const [agreed, setAgreed] = useState(false);
  const [created, setCreated] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  function next(event: FormEvent) {
    event.preventDefault();
    const n = name.trim() === "" ? "Enter your name." : null;
    const e = email.includes("@") ? null : "Enter a valid email.";
    setNameError(n);
    setEmailError(e);
    if (!n && !e) setStep(2);
  }

  const titles = ["Your details", "Your team", "Confirm"];
  const teamLabel = TEAMS.find((t) => t.value === team)?.label ?? team;

  return (
    <main
      style={{
        boxSizing: "border-box",
        minHeight: "100vh",
        padding: "var(--space-32) var(--space-16)",
        background: "var(--page)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div style={{ width: "100%", maxWidth: "28rem" }}>
        <Card.Root render={<section />} aria-labelledby="step-title">
          <Card.Header>
            <p
              style={{ margin: 0, color: "var(--text-muted)" }}
              aria-live="polite"
            >
              Step {step} of 3
            </p>
            <h1
              id="step-title"
              ref={heading}
              tabIndex={-1}
              style={{ margin: 0 }}
            >
              {titles[step - 1]}
            </h1>
          </Card.Header>

          {step === 1 && (
            <form noValidate onSubmit={next}>
              <Card.Body>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-20)",
                  }}
                >
                  <Field.Root name="name" invalid={nameError !== null}>
                    <Field.Label>Full name</Field.Label>
                    <Input
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(ev) => setName(ev.target.value)}
                    />
                    <Field.Error match={nameError !== null}>
                      {nameError}
                    </Field.Error>
                  </Field.Root>
                  <Field.Root name="email" invalid={emailError !== null}>
                    <Field.Label>Email</Field.Label>
                    <Input
                      type="email"
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
            <form
              noValidate
              onSubmit={(ev) => {
                ev.preventDefault();
                setStep(3);
              }}
            >
              <Card.Body>
                <Field.Root>
                  <Field.Label>Team size</Field.Label>
                  <Radio.Group name="team" value={team} onValueChange={setTeam}>
                    {TEAMS.map((t) => (
                      <Radio.Item key={t.value} value={t.value}>
                        {t.label}
                      </Radio.Item>
                    ))}
                  </Radio.Group>
                </Field.Root>
              </Card.Body>
              <Card.Footer>
                <Button variant="quiet" type="button" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" type="submit">
                  Continue
                </Button>
              </Card.Footer>
            </form>
          )}

          {step === 3 && (
            <form
              noValidate
              onSubmit={(ev) => {
                ev.preventDefault();
                if (agreed) setCreated(true);
              }}
            >
              <Card.Body>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-20)",
                  }}
                >
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
                    <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                      {email.trim()}
                    </dd>
                    <dt style={{ color: "var(--text-muted)" }}>Team</dt>
                    <dd style={{ margin: 0 }}>{teamLabel}</dd>
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
                  <p role="status" style={{ margin: 0 }}>
                    {created ? "Account created." : ""}
                  </p>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button
                  variant="quiet"
                  type="button"
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
            </form>
          )}
        </Card.Root>
      </div>
    </main>
  );
}
