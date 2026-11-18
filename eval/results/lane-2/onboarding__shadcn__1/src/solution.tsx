import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const TEAMS = ["Solo", "Small crew (2 to 10)", "Large crew (11 or more)"];
const TARGET = "min-h-[var(--hit-target-min)]";

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [team, setTeam] = useState("");
  const [teamError, setTeamError] = useState("");
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step, done]);

  const titles = ["Your details", "Your team", "Confirm"];

  function next1(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Enter your name.";
    if (!email.includes("@")) errs.email = "Enter a valid email.";
    setErrors(errs);
    if (!errs.name && !errs.email) setStep(2);
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (agree) setDone(true);
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground p-6 space-y-6">
        {done ? (
          <div className="space-y-2">
            <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
              Account created.
            </h1>
            <p className="text-muted-foreground text-sm">
              Welcome aboard, {name.trim()}.
            </p>
          </div>
        ) : (
          <>
            <header className="space-y-1">
              <p className="text-sm text-muted-foreground">Step {step} of 3</p>
              <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
                {titles[step - 1]}
              </h1>
            </header>

            {step === 1 && (
              <form onSubmit={next1} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    className={TARGET}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-err" : undefined}
                    autoComplete="name"
                    required
                  />
                  {errors.name && (
                    <p id="name-err" className="text-sm text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    className={TARGET}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-err" : undefined}
                    autoComplete="email"
                    required
                  />
                  {errors.email && (
                    <p id="email-err" className="text-sm text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className={TARGET}>
                    Continue
                  </Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={next2} className="space-y-4">
                <RadioGroup
                  value={team}
                  onValueChange={(v) => {
                    setTeam(v);
                    setTeamError("");
                  }}
                  aria-label="Your team"
                  aria-invalid={!!teamError}
                >
                  {TEAMS.map((t, i) => (
                    <Label
                      key={t}
                      htmlFor={`team-${i}`}
                      className={`${TARGET} flex items-center gap-3 rounded-lg border border-border px-3 cursor-pointer has-[[data-state=checked]]:border-primary`}
                    >
                      <RadioGroupItem value={t} id={`team-${i}`} />
                      {t}
                    </Label>
                  ))}
                </RadioGroup>
                {teamError && <p className="text-sm text-destructive">{teamError}</p>}
                <div className="flex justify-between gap-2">
                  <Button type="button" variant="outline" className={TARGET} onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" className={TARGET}>
                    Continue
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={submit} className="space-y-4">
                <dl className="rounded-lg border border-border p-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="text-right break-all">{name.trim()}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-right break-all">{email.trim()}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Team</dt>
                    <dd className="text-right">{team}</dd>
                  </div>
                </dl>
                <Label htmlFor="agree" className={`${TARGET} flex items-center gap-3 cursor-pointer`}>
                  <Checkbox
                    id="agree"
                    checked={agree}
                    onCheckedChange={(c) => setAgree(c === true)}
                  />
                  I agree to the terms
                </Label>
                <div className="flex justify-between gap-2">
                  <Button type="button" variant="outline" className={TARGET} onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" className={TARGET} disabled={!agree}>
                    Create account
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
