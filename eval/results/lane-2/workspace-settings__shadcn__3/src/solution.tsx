import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const hit = "min-h-[var(--hit-target-min)]";
const ROLES = ["Viewer", "Editor", "Admin"] as const;

function SettingRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b py-2 ${hit}`}>
      <Label htmlFor={id} className="flex-1 py-2 text-base">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative after:absolute after:-inset-3 after:content-['']"
      />
    </div>
  );
}

export default function WorkspaceSettings() {
  const [name, setName] = React.useState("Orbit Lab");
  const [role, setRole] = React.useState<string>("Editor");
  const [saved, setSaved] = React.useState(false);
  const [weekly, setWeekly] = React.useState(true);
  const [mentions, setMentions] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);

  return (
    <main className="bg-background text-foreground mx-auto min-h-screen w-full max-w-[var(--layout-read)] px-4 py-10 sm:px-8">
      <h1 className="mb-6 text-[length:var(--type-size-28)] leading-tight font-semibold">
        Workspace settings
      </h1>

      <Tabs defaultValue="general" className="gap-6">
        <TabsList className="h-auto w-full justify-start sm:w-fit">
          {["general", "notifications", "danger"].map((v) => (
            <TabsTrigger
              key={v}
              value={v}
              className={`${hit} px-4 text-base`}
            >
              {v === "general"
                ? "General"
                : v === "notifications"
                  ? "Notifications"
                  : "Danger zone"}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-name" className="text-base">
              Workspace name
            </Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              className={`${hit} text-base`}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base font-medium">
              Default role for new members
            </legend>
            <RadioGroup
              value={role}
              onValueChange={(v) => {
                setRole(v);
                setSaved(false);
              }}
              className="gap-1"
            >
              {ROLES.map((r) => (
                <Label
                  key={r}
                  htmlFor={`role-${r}`}
                  className={`flex cursor-pointer items-center gap-3 text-base ${hit}`}
                >
                  <RadioGroupItem value={r} id={`role-${r}`} className="size-5" />
                  {r}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <Button className={`${hit} px-6 text-base`} onClick={() => setSaved(true)}>
              Save changes
            </Button>
            <p role="status" className="text-muted-foreground text-base">
              {saved ? "Settings saved." : ""}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="flex flex-col">
          <SettingRow
            id="n-weekly"
            label="Weekly summary email"
            checked={weekly}
            onChange={setWeekly}
          />
          <SettingRow
            id="n-mentions"
            label="Mentions"
            checked={mentions}
            onChange={setMentions}
          />
        </TabsContent>

        <TabsContent value="danger" className="flex flex-col items-start gap-4">
          <p className="text-base">
            Deleting this workspace is permanent and cannot be reversed.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className={`${hit} px-6 text-base`}
              >
                Delete workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Orbit Lab?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This removes all projects and members. It cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={`${hit} px-6 text-base`}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className={`${hit} px-6 text-base`}
                  onClick={() => setDeleted(true)}
                >
                  Delete workspace
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p role="status" className="text-base">
            {deleted ? "Workspace deleted." : ""}
          </p>
        </TabsContent>
      </Tabs>
    </main>
  );
}
