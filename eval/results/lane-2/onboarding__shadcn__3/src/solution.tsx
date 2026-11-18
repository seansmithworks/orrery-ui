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
  const [team, setTeam] = useState("Solo");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);

  function next1() {
    const e: { name?: string; email?: string } = {};
    if (!name.trim()) e.name = "Enter your name.";
    if (!email.includes("@")) e.email = "Enter a valid email.";
    setErrors(e);
    if (!e.name && !e.email) setStep(2);
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-start justify-center p-6">
      <section className="w-full max-w-md rounded-[var(--radius-panel)] border border-border bg-card text-card-foreground p-6 mt-8">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Step {step} of 3
        </p>

        {step === 1 && (
          <form
            noValidate
            onSubmit={(ev) => {
              ev.preventDefault();
              next1();
            }}
            className="mt-2 space-y-5"
          >
            <h1 className="text-2xl font-semibold">Your details</h1>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                className={hit}
                value={name}
                required
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-err" : undefined}
                onChange={(e) => setName(e.target.value)}
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
                className={hit}
                value={email}
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-err" : undefined}
                onChange={(e) => setEmail(e.target.value)}
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
          <div className="mt-2 space-y-5">
            <h1 className="text-2xl font-semibold">Your team</h1>
            <RadioGroup value={team} onValueChange={setTeam} aria-label="Your team">
              {TEAMS.map((t, i) => (
                <Label
                  key={t}
                  htmlFor={`team-${i}`}
                  className={`${hit} flex items-center gap-3 rounded-[var(--radius-control)] border border-border px-3 cursor-pointer has-[[data-state=checked]]:border-primary`}
                >
                  <RadioGroupItem id={`team-${i}`} value={t} />
                  {t}
                </Label>
              ))}
            </RadioGroup>
            <div className="flex justify-between">
              <Button variant="outline" className={hit} onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className={hit} onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-2 space-y-5">
            <h1 className="text-2xl font-semibold">Confirm</h1>
            <dl className="space-y-2 rounded-[var(--radius-control)] border border-border p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="break-all text-right">{name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all text-right">{email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Team</dt>
                <dd className="text-right">{team}</dd>
              </div>
            </dl>
            <Label htmlFor="terms" className={`${hit} flex items-center gap-3 cursor-pointer`}>
              <Checkbox
                id="terms"
                checked={agreed}
                disabled={done}
                onCheckedChange={(v) => setAgreed(v === true)}
              />
              I agree to the terms
            </Label>
            {done ? (
              <p role="status" className="font-medium text-primary">
                Account created.
              </p>
            ) : (
              <div className="flex justify-between">
                <Button variant="outline" className={hit} onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button className={hit} disabled={!agreed} onClick={() => agreed && setDone(true)}>
                  Create account
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
