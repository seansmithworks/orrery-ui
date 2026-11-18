import { useEffect, useRef, useState } from "react";
import "./solution.css";

const TEAMS = ["Solo", "Small crew (2 to 10)", "Large crew (11 or more)"];
const TITLES = ["Your details", "Your team", "Confirm"];

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [teamError, setTeamError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step, done]);

  function next1(e: React.FormEvent) {
    e.preventDefault();
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) errs.name = "Enter your name.";
    if (!email.includes("@")) errs.email = "Enter a valid email.";
    setErrors(errs);
    if (errs.name) nameRef.current?.focus();
    else if (errs.email) emailRef.current?.focus();
    else setStep(2);
  }

  function next2(e: React.FormEvent) {
    e.preventDefault();
    if (!team) {
      setTeamError("Choose one option.");
      return;
    }
    setTeamError("");
    setStep(3);
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (agreed) setDone(true);
  }

  return (
    <div className="su-page">
      <main className="su-card">
        {done ? (
          <>
            <h1 className="su-title" tabIndex={-1} ref={heading}>
              Mission planner
            </h1>
            <p className="su-success" role="status">
              Account created.
            </p>
          </>
        ) : (
          <>
            <p className="su-step">Step {step} of 3</p>
            <div className="su-bar" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= step ? "on" : ""} />
              ))}
            </div>
            <h1 className="su-title" tabIndex={-1} ref={heading}>
              {TITLES[step - 1]}
            </h1>

            {step === 1 && (
              <form onSubmit={next1} noValidate>
                <div className="su-field">
                  <label htmlFor="su-name">Full name</label>
                  <input
                    id="su-name"
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "su-name-err" : undefined}
                  />
                  {errors.name && (
                    <p className="su-error" id="su-name-err">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="su-field">
                  <label htmlFor="su-email">Email</label>
                  <input
                    id="su-email"
                    ref={emailRef}
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "su-email-err" : undefined}
                  />
                  {errors.email && (
                    <p className="su-error" id="su-email-err">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="su-actions">
                  <button type="submit" className="su-btn primary">
                    Continue
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={next2} noValidate>
                <fieldset className="su-fieldset">
                  <legend>Team size</legend>
                  {TEAMS.map((t) => (
                    <label key={t} className={"su-option" + (team === t ? " sel" : "")}>
                      <input
                        type="radio"
                        name="team"
                        value={t}
                        checked={team === t}
                        onChange={() => {
                          setTeam(t);
                          setTeamError("");
                        }}
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                  {teamError && <p className="su-error">{teamError}</p>}
                </fieldset>
                <div className="su-actions">
                  <button type="button" className="su-btn" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button type="submit" className="su-btn primary">
                    Continue
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={create}>
                <dl className="su-summary">
                  <dt>Name</dt>
                  <dd>{name}</dd>
                  <dt>Email</dt>
                  <dd>{email}</dd>
                  <dt>Team</dt>
                  <dd>{team}</dd>
                </dl>
                <label className="su-check">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>I agree to the terms</span>
                </label>
                <div className="su-actions">
                  <button type="button" className="su-btn" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button type="submit" className="su-btn primary" disabled={!agreed}>
                    Create account
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
