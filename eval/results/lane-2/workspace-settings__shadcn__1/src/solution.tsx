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
const bigControl = `${hit} min-w-[var(--hit-target-min)]`;
const extendHit =
  "relative after:absolute after:-inset-[10px] after:content-['']";

const ROLES = ["Viewer", "Editor", "Admin"] as const;

export default function SettingsPage() {
  const [name, setName] = React.useState("Orbit Lab");
  const [role, setRole] = React.useState<string>("Editor");
  const [saved, setSaved] = React.useState(false);
  const [weekly, setWeekly] = React.useState(true);
  const [mentions, setMentions] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <main className="bg-background text-foreground min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
        <h1 className="text-2xl font-semibold">Workspace settings</h1>

        <Tabs defaultValue="general" className="gap-6">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            {["general", "notifications", "danger"].map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                className={`${bigControl} px-4 data-[state=active]:border-border`}
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
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                className={`${hit} border-input`}
              />
            </div>

            <fieldset className="flex flex-col gap-1">
              <legend className="mb-2 text-sm font-medium">
                Default role for new members
              </legend>
              <RadioGroup
                value={role}
                onValueChange={(v) => {
                  setRole(v);
                  setSaved(false);
                }}
                className="gap-0"
                aria-label="Default role for new members"
              >
                {ROLES.map((r) => (
                  <label
                    key={r}
                    htmlFor={`role-${r}`}
                    className={`${hit} flex cursor-pointer items-center gap-3 text-sm`}
                  >
                    <RadioGroupItem
                      id={`role-${r}`}
                      value={r}
                      className={`${extendHit} size-5`}
                    />
                    {r}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                className={`${bigControl} px-6`}
                onClick={() => setSaved(true)}
              >
                Save changes
              </Button>
              <p role="status" className="text-muted-foreground text-sm">
                {saved ? "Settings saved." : ""}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="flex flex-col">
            <div
              className={`${hit} flex items-center justify-between gap-4 border-b py-2`}
            >
              <Label htmlFor="weekly">Weekly summary email</Label>
              <Switch
                id="weekly"
                checked={weekly}
                onCheckedChange={setWeekly}
                className={`${extendHit} border-input`}
              />
            </div>
            <div
              className={`${hit} flex items-center justify-between gap-4 py-2`}
            >
              <Label htmlFor="mentions">Mentions</Label>
              <Switch
                id="mentions"
                checked={mentions}
                onCheckedChange={setMentions}
                className={`${extendHit} border-input`}
              />
            </div>
          </TabsContent>

          <TabsContent value="danger" className="flex flex-col gap-4">
            <p className="text-sm">
              Deleting this workspace is permanent and cannot be reversed.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className={`${bigControl} px-6`}
                  >
                    Delete workspace
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Orbit Lab?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all projects and members. It cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className={bigControl}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className={`${bigControl} bg-destructive text-primary-foreground`}
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
              <p role="status" className="text-muted-foreground text-sm">
                {deleted ? "Workspace deleted." : ""}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
