import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
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
  const [nameErr, setNameErr] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [teamErr, setTeamErr] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step, done]);

  const next1 = (e: FormEvent) => {
    e.preventDefault();
    const ne = name.trim() ? "" : "Enter your name.";
    const ee = email.includes("@") ? "" : "Enter a valid email.";
    setNameErr(ne);
    setEmailErr(ee);
    if (!ne && !ee) setStep(2);
  };

  const next2 = (e: FormEvent) => {
    e.preventDefault();
    if (!team) { setTeamErr("Choose one option."); return; }
    setTeamErr("");
    setStep(3);
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (agreed) setDone(true);
  };

  if (done) {
    return (
      <div className="su-page">
        <main className="su-card">
          <h1 className="su-title" ref={heading} tabIndex={-1} style={{ display: "none" }}>Mission planner sign-up</h1>
          <p className="su-done" role="status" ref={undefined}>Account created.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="su-page">
      <main className="su-card">
        <p className="su-step">Step {step} of 3</p>
        <div className="su-bar" aria-hidden="true">
          {[1, 2, 3].map((n) => <span key={n} className={n <= step ? "on" : ""} />)}
        </div>
        <h1 className="su-title" ref={heading} tabIndex={-1}>{TITLES[step - 1]}</h1>

        {step === 1 && (
          <form onSubmit={next1} noValidate>
            <div className="su-field">
              <label className="su-label" htmlFor="su-name">Full name</label>
              <input
                id="su-name" className="su-input" value={name} required
                autoComplete="name"
                aria-invalid={!!nameErr} aria-describedby={nameErr ? "su-name-err" : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {nameErr && <p id="su-name-err" className="su-error">{nameErr}</p>}
            </div>
            <div className="su-field">
              <label className="su-label" htmlFor="su-email">Email</label>
              <input
                id="su-email" className="su-input" value={email} required type="text"
                inputMode="email" autoComplete="email"
                aria-invalid={!!emailErr} aria-describedby={emailErr ? "su-email-err" : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailErr && <p id="su-email-err" className="su-error">{emailErr}</p>}
            </div>
            <div className="su-actions">
              <button type="submit" className="su-btn primary">Continue</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={next2} noValidate>
            <fieldset className="su-fieldset" aria-describedby={teamErr ? "su-team-err" : undefined}>
              <legend className="su-label">Team size</legend>
              {TEAMS.map((t) => (
                <label key={t} className="su-option">
                  <input
                    type="radio" name="team" value={t} checked={team === t}
                    onChange={() => { setTeam(t); setTeamErr(""); }}
                  />
                  <span>{t}</span>
                </label>
              ))}
              {teamErr && <p id="su-team-err" className="su-error">{teamErr}</p>}
            </fieldset>
            <div className="su-actions">
              <button type="button" className="su-btn" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="su-btn primary">Continue</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={create}>
            <dl className="su-summary">
              <div><dt>Name</dt><dd>{name.trim()}</dd></div>
              <div><dt>Email</dt><dd>{email.trim()}</dd></div>
              <div><dt>Team</dt><dd>{team}</dd></div>
            </dl>
            <label className="su-check">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I agree to the terms</span>
            </label>
            <div className="su-actions">
              <button type="button" className="su-btn" onClick={() => setStep(2)}>Back</button>
              <button type="submit" className="su-btn primary" disabled={!agreed}>Create account</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
