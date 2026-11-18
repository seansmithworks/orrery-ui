import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ProfileSettings() {
  const [displayName, setDisplayName] = React.useState("");
  const [timeZone, setTimeZone] = React.useState("");
  const [emailOrbits, setEmailOrbits] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(true);
  }

  // Any edit after saving clears the status.
  function touch<T>(setter: (v: T) => void) {
    return (v: T) => {
      setSaved(false);
      setter(v);
    };
  }

  return (
    <main className="bg-background text-foreground min-h-screen p-6 sm:p-10">
      <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Profile settings</h1>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            name="displayName"
            value={displayName}
            onChange={(e) => touch(setDisplayName)(e.target.value)}
            aria-describedby="display-name-hint"
          />
          <p id="display-name-hint" className="text-muted-foreground text-sm">
            Shown to your crew.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="time-zone">Time zone</Label>
          <Select
            name="timeZone"
            value={timeZone}
            onValueChange={touch(setTimeZone)}
          >
            <SelectTrigger id="time-zone" className="w-full">
              <SelectValue placeholder="Choose a time zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utc">UTC</SelectItem>
              <SelectItem value="berlin">Berlin</SelectItem>
              <SelectItem value="tokyo">Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="email-orbits">Email me about new orbits</Label>
          <Switch
            id="email-orbits"
            name="emailOrbits"
            checked={emailOrbits}
            onCheckedChange={touch(setEmailOrbits)}
          />
        </div>

        <div className="flex flex-col items-start gap-3">
          <Button type="submit">Save profile</Button>
          <p role="status" className="text-muted-foreground text-sm min-h-5">
            {saved ? "Profile saved." : ""}
          </p>
        </div>
      </form>
    </main>
  );
}
