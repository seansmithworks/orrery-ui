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
} from "@/components/ui/alert-dialog";

const HIT = "min-h-[var(--hit-target-min)]";
const ROLES = ["Viewer", "Editor", "Admin"] as const;

function ToggleRow({
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
    <div className={`flex items-center justify-between gap-4 ${HIT}`}>
      <Label htmlFor={id} className={`flex-1 ${HIT} cursor-pointer text-base`}>
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=unchecked]:bg-secondary data-[state=unchecked]:border-input [&[data-state=unchecked]>span]:bg-foreground"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = React.useState("general");
  const [name, setName] = React.useState("Orbit Lab");
  const [role, setRole] = React.useState("Editor");
  const [saved, setSaved] = React.useState(false);
  const [weekly, setWeekly] = React.useState(true);
  const [mentions, setMentions] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);

  const trigger = `${HIT} px-4 text-base`;

  return (
    <main className="mx-auto w-full max-w-[var(--layout-read)] px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-3xl font-semibold">Workspace settings</h1>

      <Tabs value={section} onValueChange={setSection} className="gap-6">
        <TabsList className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="general" className={trigger}>
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className={trigger}>
            Notifications
          </TabsTrigger>
          <TabsTrigger value="danger" className={trigger}>
            Danger zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-name" className="text-base">
              Workspace name
            </Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${HIT} text-base`}
            />
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-base font-medium">
              Default role for new members
            </legend>
            <RadioGroup value={role} onValueChange={setRole} className="gap-0">
              {ROLES.map((r) => (
                <Label
                  key={r}
                  htmlFor={`role-${r}`}
                  className={`${HIT} cursor-pointer gap-3 text-base font-normal`}
                >
                  <RadioGroupItem value={r} id={`role-${r}`} />
                  {r}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              className={`${HIT} px-6 text-base`}
              onClick={() => setSaved(true)}
            >
              Save changes
            </Button>
            <p role="status" className="text-base">
              {saved ? "Settings saved." : ""}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="flex flex-col">
          <ToggleRow
            id="weekly"
            label="Weekly summary email"
            checked={weekly}
            onChange={setWeekly}
          />
          <ToggleRow
            id="mentions"
            label="Mentions"
            checked={mentions}
            onChange={setMentions}
          />
        </TabsContent>

        <TabsContent value="danger" className="flex flex-col items-start gap-4">
          <p className="text-base">
            Deleting this workspace is permanent and cannot be reversed.
          </p>
          <Button
            variant="destructive"
            className={`${HIT} px-6 text-base`}
            onClick={() => setConfirmOpen(true)}
          >
            Delete workspace
          </Button>
          <p role="status" className="text-base">
            {deleted ? "Workspace deleted." : ""}
          </p>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orbit Lab?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This removes all projects and members. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={`${HIT} px-6 text-base`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={`${HIT} px-6 text-base`}
              onClick={() => {
                setConfirmOpen(false);
                setDeleted(true);
              }}
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
