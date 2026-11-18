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
  const [saved, setSaved] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(true);
  }

  // Any edit after saving clears the confirmation.
  const clear = () => setSaved(false);

  return (
    <main className="bg-background text-foreground min-h-screen p-4 sm:p-8">
      <form
        onSubmit={onSubmit}
        onChange={clear}
        className="mx-auto flex w-full max-w-md flex-col gap-6"
      >
        <h1 className="text-2xl font-semibold">Profile settings</h1>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            name="displayName"
            autoComplete="nickname"
            aria-describedby="display-name-hint"
            className="h-[var(--hit-target-min)]"
          />
          <p id="display-name-hint" className="text-muted-foreground text-sm">
            Shown to your crew.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="time-zone">Time zone</Label>
          <Select name="timeZone" onValueChange={clear}>
            <SelectTrigger
              id="time-zone"
              className="h-[var(--hit-target-min)] w-full"
            >
              <SelectValue placeholder="Choose a time zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem className="min-h-[var(--hit-target-min)]" value="utc">
                UTC
              </SelectItem>
              <SelectItem
                className="min-h-[var(--hit-target-min)]"
                value="berlin"
              >
                Berlin
              </SelectItem>
              <SelectItem
                className="min-h-[var(--hit-target-min)]"
                value="tokyo"
              >
                Tokyo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-h-[var(--hit-target-min)] items-center justify-between gap-4">
          <Label htmlFor="orbit-emails" className="flex-1 cursor-pointer py-3">
            Email me about new orbits
          </Label>
          <Switch
            id="orbit-emails"
            name="orbitEmails"
            onCheckedChange={clear}
            className="h-6 w-11 data-[state=unchecked]:bg-muted-foreground [&>span]:size-5"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            className="h-[var(--hit-target-min)] w-full sm:w-auto sm:self-start"
          >
            Save profile
          </Button>
          <p role="status" aria-live="polite" className="min-h-6 text-sm">
            {saved ? "Profile saved." : ""}
          </p>
        </div>
      </form>
    </main>
  );
}
