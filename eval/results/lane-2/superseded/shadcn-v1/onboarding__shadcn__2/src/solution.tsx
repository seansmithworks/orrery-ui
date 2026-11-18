import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TEAMS = ["Solo", "Small crew (2 to 10)", "Large crew (11 or more)"];

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("");
  const [teamError, setTeamError] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [agreed, setAgreed] = useState(false);
  const [created, setCreated] = useState(false);

  const titles = ["Your details", "Your team", "Confirm"];

  function next1() {
    const e: { name?: string; email?: string } = {};
    if (!name.trim()) e.name = "Enter your name.";
    if (!email.includes("@")) e.email = "Enter a valid email.";
    setErrors(e);
    if (!e.name && !e.email) setStep(2);
  }

  function next2() {
    if (!team) {
      setTeamError("Choose a team size.");
      return;
    }
    setTeamError("");
    setStep(3);
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          <CardTitle>{titles[step - 1]}</CardTitle>
          <CardDescription>Mission planner sign-up</CardDescription>
        </CardHeader>

        {step === 1 && (
          <form
            noValidate
            onSubmit={(ev) => {
              ev.preventDefault();
              next1();
            }}
          >
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
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
            </CardContent>
            <CardFooter className="justify-end pt-6">
              <Button type="submit">Continue</Button>
            </CardFooter>
          </form>
        )}

        {step === 2 && (
          <>
            <CardContent className="space-y-2">
              <RadioGroup
                value={team}
                onValueChange={(v) => {
                  setTeam(v);
                  setTeamError("");
                }}
                aria-label="Team size"
              >
                {TEAMS.map((t, i) => (
                  <div key={t} className="flex items-center gap-3">
                    <RadioGroupItem value={t} id={`team-${i}`} />
                    <Label htmlFor={`team-${i}`}>{t}</Label>
                  </div>
                ))}
              </RadioGroup>
              {teamError && (
                <p className="text-sm text-destructive">{teamError}</p>
              )}
            </CardContent>
            <CardFooter className="justify-between pt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={next2}>Continue</Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="break-words">{name}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-words">{email}</dd>
                <dt className="text-muted-foreground">Team</dt>
                <dd>{team}</dd>
              </dl>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  disabled={created}
                  onCheckedChange={(c) => setAgreed(c === true)}
                />
                <Label htmlFor="terms">I agree to the terms</Label>
              </div>
              {created && (
                <p role="status" className="text-sm font-medium text-primary">
                  Account created.
                </p>
              )}
            </CardContent>
            <CardFooter className="justify-between pt-6">
              <Button
                variant="outline"
                disabled={created}
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                disabled={!agreed || created}
                onClick={() => agreed && setCreated(true)}
              >
                Create account
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </main>
  );
}
