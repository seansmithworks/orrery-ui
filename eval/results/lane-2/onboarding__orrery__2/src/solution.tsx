import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Field, Input, Radio } from "./kit";
import "./solution.css";

const TEAMS = [
  "Solo",
  "Small crew (2 to 10)",
  "Large crew (11 or more)",
] as const;

const TITLES = ["Your details", "Your team", "Confirm"];

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [team, setTeam] = useState<string>(TEAMS[0]);
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

  const checkName = (v: string) => (v.trim() ? null : "Enter your name.");
  const checkEmail = (v: string) =>
    v.includes("@") ? null : "Enter a valid email.";

  function next1(event: FormEvent) {
    event.preventDefault();
    const n = checkName(name);
    const e = checkEmail(email);
    setNameError(n);
    setEmailError(e);
    if (!n && !e) setStep(2);
  }

  function next2(event: FormEvent) {
    event.preventDefault();
    setStep(3);
  }

  function create(event: FormEvent) {
    event.preventDefault();
    if (agreed) setCreated(true);
  }

  return (
    <main className="signup">
      <div className="signup__inner">
        <Card.Root render={<section />} aria-labelledby="signup-title">
          <Card.Header>
            <p className="signup__step">Step {step} of 3</p>
            <h2 id="signup-title" className="signup__title" ref={heading} tabIndex={-1}>
              {TITLES[step - 1]}
            </h2>
          </Card.Header>

          {step === 1 && (
            <form noValidate onSubmit={next1} className="signup__form">
              <Card.Body>
                <Field.Root name="name" invalid={nameError !== null}>
                  <Field.Label>Full name</Field.Label>
                  <Input
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(ev) => {
                      setName(ev.target.value);
                      if (nameError) setNameError(checkName(ev.target.value));
                    }}
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
                    onChange={(ev) => {
                      setEmail(ev.target.value);
                      if (emailError) setEmailError(checkEmail(ev.target.value));
                    }}
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
            <form noValidate onSubmit={next2} className="signup__form">
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
            <form noValidate onSubmit={create} className="signup__form">
              <Card.Body>
                <dl className="signup__summary">
                  <dt>Name</dt>
                  <dd>{name}</dd>
                  <dt>Email</dt>
                  <dd>{email}</dd>
                  <dt>Team</dt>
                  <dd>{team}</dd>
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
                <p className="signup__done" role="status">
                  {created ? "Account created." : ""}
                </p>
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
