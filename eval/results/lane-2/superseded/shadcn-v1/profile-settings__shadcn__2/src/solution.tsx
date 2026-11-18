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
  const [email, setEmail] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  return (
    <main className="bg-background text-foreground min-h-screen p-6 sm:p-10">
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

        <div className="flex items-center gap-3">
          <Switch
            id="email-orbits"
            checked={email}
            onCheckedChange={(v) => {
              setEmail(v);
              setSaved(false);
            }}
          />
          <Label htmlFor="email-orbits">Email me about new orbits</Label>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit">Save profile</Button>
          <p role="status" className="text-muted-foreground text-sm">
            {saved ? "Profile saved." : ""}
          </p>
        </div>
      </form>
    </main>
  );
}
