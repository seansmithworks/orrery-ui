import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Field, Input, Radio } from "./kit";

const TEAMS = [
  { value: "Solo", label: "Solo" },
  { value: "Small crew (2 to 10)", label: "Small crew (2 to 10)" },
  { value: "Large crew (11 or more)", label: "Large crew (11 or more)" },
];

const column = (gap: string) =>
  ({ display: "flex", flexDirection: "column", gap }) as const;

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [team, setTeam] = useState("");
  const [teamError, setTeamError] = useState<string | null>(null);
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

  function continueFromDetails(event: FormEvent) {
    event.preventDefault();
    const n = name.trim() === "" ? "Enter your name." : null;
    const e = email.includes("@") ? null : "Enter a valid email.";
    setNameError(n);
    setEmailError(e);
    if (!n && !e) setStep(2);
  }

  function continueFromTeam(event: FormEvent) {
    event.preventDefault();
    if (!team) {
      setTeamError("Choose one option.");
      return;
    }
    setTeamError(null);
    setStep(3);
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
        padding: "var(--space-24)",
        background: "var(--page)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: "var(--layout-measure)", margin: "0 auto" }}>
        <Card.Root render={<section />} aria-labelledby="signup-title">
          <Card.Header>
            <span style={{ color: "var(--text-muted)" }}>
              Step {step} of 3
            </span>
            <h2 id="signup-title" ref={heading} tabIndex={-1}>
              {titles[step - 1]}
            </h2>
          </Card.Header>

          {step === 1 && (
            <form noValidate onSubmit={continueFromDetails} style={column("var(--space-24)")}>
              <Card.Body>
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
                  <Field.Error match={emailError !== null}>{emailError}</Field.Error>
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
            <form noValidate onSubmit={continueFromTeam} style={column("var(--space-24)")}>
              <Card.Body>
                <Field.Root invalid={teamError !== null}>
                  <Field.Label>Team size</Field.Label>
                  <Radio.Group
                    name="team"
                    required
                    value={team}
                    onValueChange={(v: unknown) => {
                      setTeam(String(v));
                      setTeamError(null);
                    }}
                  >
                    {TEAMS.map((t) => (
                      <Radio.Item key={t.value} value={t.value}>
                        {t.label}
                      </Radio.Item>
                    ))}
                  </Radio.Group>
                  <Field.Error match={teamError !== null}>{teamError}</Field.Error>
                </Field.Root>
              </Card.Body>
              <Card.Footer>
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" type="submit">
                  Continue
                </Button>
              </Card.Footer>
            </form>
          )}

          {step === 3 && (
            <form noValidate onSubmit={create} style={column("var(--space-24)")}>
              <Card.Body>
                <dl style={{ ...column("var(--space-8)"), margin: 0 }}>
                  {[
                    ["Name", name.trim()],
                    ["Email", email.trim()],
                    ["Team", team],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
                      <dd style={{ margin: 0 }}>{v}</dd>
                    </div>
                  ))}
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
                <p role="status" style={{ margin: 0 }}>
                  {created ? "Account created." : ""}
                </p>
              </Card.Body>
              <Card.Footer>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={created}
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button variant="primary" type="submit" disabled={!agreed || created}>
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
