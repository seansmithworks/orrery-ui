import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const TEAMS = ["Solo", "Small crew (2 to 10)", "Large crew (11 or more)"];
const hit = "min-h-[var(--hit-target-min)]";

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [team, setTeam] = useState("");
  const [teamError, setTeamError] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);

  function next1(e: React.FormEvent) {
    e.preventDefault();
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) errs.name = "Enter your name.";
    if (!email.includes("@")) errs.email = "Enter a valid email.";
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  }

  function next2(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return setTeamError(true);
    setTeamError(false);
    setStep(3);
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[var(--radius-panel)] border border-border bg-card text-card-foreground p-6 space-y-6">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Step {step} of 3
          </p>
          <h1 className="text-2xl font-semibold">
            {step === 1 ? "Your details" : step === 2 ? "Your team" : "Confirm"}
          </h1>
        </header>

        {step === 1 && (
          <form onSubmit={next1} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                className={hit}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-err" : undefined}
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
                type="text"
                inputMode="email"
                required
                className={hit}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-err" : undefined}
              />
              {errors.email && (
                <p id="email-err" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" className={hit}>
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
                setTeamError(false);
              }}
              aria-label="Your team"
            >
              {TEAMS.map((t) => (
                <Label
                  key={t}
                  htmlFor={`team-${t}`}
                  className={`${hit} flex items-center gap-3 rounded-[var(--radius-control)] border border-border px-3 cursor-pointer has-[[data-state=checked]]:border-primary`}
                >
                  <RadioGroupItem value={t} id={`team-${t}`} />
                  {t}
                </Label>
              ))}
            </RadioGroup>
            {teamError && (
              <p className="text-sm text-destructive">Choose one option.</p>
            )}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                className={hit}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button type="submit" className={hit}>
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === 3 && !done && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="break-words">{name}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-words">{email}</dd>
              <dt className="text-muted-foreground">Team</dt>
              <dd>{team}</dd>
            </dl>
            <Label htmlFor="terms" className={`${hit} flex items-center gap-3 cursor-pointer`}>
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(c) => setAgreed(c === true)}
              />
              I agree to the terms
            </Label>
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                className={hit}
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                type="button"
                className={hit}
                disabled={!agreed}
                onClick={() => agreed && setDone(true)}
              >
                Create account
              </Button>
            </div>
          </div>
        )}

        {done && (
          <p role="status" className="text-lg font-medium">
            Account created.
          </p>
        )}
      </div>
    </main>
  );
}
