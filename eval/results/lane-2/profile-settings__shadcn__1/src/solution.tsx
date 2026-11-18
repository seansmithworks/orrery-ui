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

  const touch = "min-h-[var(--hit-target-min)]";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(true);
  }

  // Any edit after saving clears the stale confirmation.
  const edited = () => setSaved(false);

  return (
    <main className="bg-background text-foreground min-h-screen px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-md flex-col gap-6"
      >
        <h1 className="text-xl font-semibold">Profile settings</h1>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            name="displayName"
            className={touch}
            value={displayName}
            aria-describedby="display-name-hint"
            onChange={(e) => {
              setDisplayName(e.target.value);
              edited();
            }}
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
            onValueChange={(v) => {
              setTimeZone(v);
              edited();
            }}
          >
            <SelectTrigger id="time-zone" className={`${touch} w-full`}>
              <SelectValue placeholder="Choose a time zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem className={touch} value="utc">UTC</SelectItem>
              <SelectItem className={touch} value="berlin">Berlin</SelectItem>
              <SelectItem className={touch} value="tokyo">Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`${touch} flex items-center justify-between gap-4`}>
          <Label htmlFor="email-orbits" className={`${touch} flex-1`}>
            Email me about new orbits
          </Label>
          <Switch
            id="email-orbits"
            name="emailOrbits"
            checked={emailOrbits}
            onCheckedChange={(v) => {
              setEmailOrbits(v);
              edited();
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" className={`${touch} w-full`}>
            Save profile
          </Button>
          <p role="status" className="text-sm">
            {saved ? "Profile saved." : ""}
          </p>
        </div>
      </form>
    </main>
  );
}
