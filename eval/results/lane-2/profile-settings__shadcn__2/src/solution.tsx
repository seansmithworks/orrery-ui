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
  const [name, setName] = React.useState("");
  const [zone, setZone] = React.useState("");
  const [emailOrbits, setEmailOrbits] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const touch = "min-h-[var(--hit-target-min)]";

  return (
    <main className="bg-background text-foreground min-h-screen p-6 sm:p-12">
      <form
        className="mx-auto flex w-full max-w-md flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <h1 className="text-2xl font-semibold">Profile settings</h1>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            name="displayName"
            className={touch}
            value={name}
            aria-describedby="display-name-hint"
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
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
            value={zone}
            onValueChange={(v) => {
              setZone(v);
              setSaved(false);
            }}
          >
            <SelectTrigger id="time-zone" className={`${touch} w-full`}>
              <SelectValue placeholder="Choose a time zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utc" className={touch}>UTC</SelectItem>
              <SelectItem value="berlin" className={touch}>Berlin</SelectItem>
              <SelectItem value="tokyo" className={touch}>Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`flex items-center justify-between gap-4 ${touch}`}>
          <Label htmlFor="email-orbits">Email me about new orbits</Label>
          <Switch
            id="email-orbits"
            name="emailOrbits"
            checked={emailOrbits}
            onCheckedChange={(v) => {
              setEmailOrbits(v);
              setSaved(false);
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" className={`${touch} w-full sm:w-fit`}>
            Save profile
          </Button>
          <p role="status" className="text-muted-foreground min-h-5 text-sm">
            {saved ? "Profile saved." : ""}
          </p>
        </div>
      </form>
    </main>
  );
}
