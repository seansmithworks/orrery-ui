import { useEffect, useRef, useState } from "react";
import { Button, Card, Checkbox, Field, Input, Radio } from "./kit";

const TEAMS = ["Solo", "Small crew (2 to 10)", "Large crew (11 or more)"];

const col = {
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
  const [team, setTeam] = useState("");
  const [teamError, setTeamError] = useState(false);
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

  function next1() {
    const n = name.trim() ? null : "Enter your name.";
    const e = email.includes("@") ? null : "Enter a valid email.";
    setNameError(n);
    setEmailError(e);
    if (!n && !e) setStep(2);
  }

  function next2() {
    if (!team) {
      setTeamError(true);
      return;
    }
    setStep(3);
  }

  const titles = ["Your details", "Your team", "Confirm"];

  return (
    <main
      style={{
        boxSizing: "border-box",
        minHeight: "100vh",
        padding: "var(--space-24)",
        background: "var(--page)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: "var(--layout-measure)", margin: "0 auto" }}>
        <Card.Root render={<section />} aria-labelledby="step-title">
          <Card.Header>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--type-size-12)",
                lineHeight: "var(--type-line-height-12)",
              }}
            >
              Step {step} of 3
            </p>
            <h1 id="step-title" ref={heading} tabIndex={-1}>
              {titles[step - 1]}
            </h1>
          </Card.Header>

          {step === 1 && (
            <form
              noValidate
              onSubmit={(ev) => {
                ev.preventDefault();
                next1();
              }}
              style={col}
            >
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
                next2();
              }}
              style={col}
            >
              <Field.Root invalid={teamError}>
                <Field.Label>Team size</Field.Label>
                <Radio.Group
                  name="team"
                  required
                  value={team}
                  onValueChange={(v: string) => {
                    setTeam(v);
                    setTeamError(false);
                  }}
                >
                  {TEAMS.map((t) => (
                    <Radio.Item key={t} value={t}>
                      {t}
                    </Radio.Item>
                  ))}
                </Radio.Group>
                <Field.Error match={teamError}>Choose a team size.</Field.Error>
              </Field.Root>
              <Card.Footer>
                <Button type="button" onClick={() => setStep(1)}>
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
              style={col}
            >
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
                <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{name}</dd>
                <dt style={{ color: "var(--text-muted)" }}>Email</dt>
                <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{email}</dd>
                <dt style={{ color: "var(--text-muted)" }}>Team</dt>
                <dd style={{ margin: 0 }}>{team}</dd>
              </dl>
              <Field.Root>
                <Field.Label>
                  <Checkbox
                    name="terms"
                    checked={agreed}
                    onCheckedChange={(c: boolean) => setAgreed(c)}
                    disabled={created}
                  />
                  I agree to the terms
                </Field.Label>
              </Field.Root>
              <Card.Footer>
                <Button
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
