import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEAMS = ["Solo", "Small crew (2 to 10)", "Large crew (11 or more)"];

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("Solo");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const next1 = () => {
    const e: { name?: string; email?: string } = {};
    if (!name.trim()) e.name = "Enter your name.";
    if (!email.includes("@")) e.email = "Enter a valid email.";
    setErrors(e);
    if (!e.name && !e.email) setStep(2);
  };

  const titles = ["Your details", "Your team", "Confirm"];

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          <CardTitle>{titles[step - 1]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <form
              noValidate
              className="space-y-4"
              onSubmit={(ev) => {
                ev.preventDefault();
                next1();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={name}
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
                  required
                  value={email}
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
              <Button type="submit">Continue</Button>
            </form>
          )}

          {step === 2 && (
            <>
              <RadioGroup value={team} onValueChange={setTeam}>
                {TEAMS.map((t, i) => (
                  <div key={t} className="flex items-center gap-2">
                    <RadioGroupItem value={t} id={`team-${i}`} />
                    <Label htmlFor={`team-${i}`}>{t}</Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd>{name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Email:</dt>
                  <dd>{email}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Team:</dt>
                  <dd>{team}</dd>
                </div>
              </dl>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  disabled={done}
                  onCheckedChange={(c) => setAgreed(c === true)}
                />
                <Label htmlFor="terms">I agree to the terms</Label>
              </div>
              {done ? (
                <p role="status" className="font-medium">
                  Account created.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={!agreed}
                    onClick={() => agreed && setDone(true)}
                  >
                    Create account
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
