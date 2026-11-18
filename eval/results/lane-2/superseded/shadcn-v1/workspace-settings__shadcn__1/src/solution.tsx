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

const ROLES = ["Viewer", "Editor", "Admin"] as const;

export default function SettingsPage() {
  const [name, setName] = React.useState("Orbit Lab");
  const [role, setRole] = React.useState<string>("Editor");
  const [weekly, setWeekly] = React.useState(true);
  const [mentions, setMentions] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);

  return (
    <main className="bg-background text-foreground min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">Workspace settings</h1>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="danger">Danger zone</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm font-medium">
                Default role for new members
              </legend>
              <RadioGroup
                value={role}
                onValueChange={setRole}
                aria-label="Default role for new members"
              >
                {ROLES.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={`role-${r}`} />
                    <Label htmlFor={`role-${r}`}>{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex items-center gap-4">
              <Button onClick={() => setSaved(true)}>Save changes</Button>
              <p role="status" className="text-muted-foreground text-sm">
                {saved ? "Settings saved." : ""}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="weekly">Weekly summary email</Label>
              <Switch
                id="weekly"
                checked={weekly}
                onCheckedChange={setWeekly}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="mentions">Mentions</Label>
              <Switch
                id="mentions"
                checked={mentions}
                onCheckedChange={setMentions}
              />
            </div>
          </TabsContent>

          <TabsContent value="danger" className="mt-4 flex flex-col gap-4">
            <p className="text-sm">
              Deleting this workspace is permanent and cannot be reversed.
            </p>
            <div className="flex items-center gap-4">
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Delete workspace
              </Button>
              <p role="status" className="text-muted-foreground text-sm">
                {deleted ? "Workspace deleted." : ""}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orbit Lab?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all projects and members. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => setDeleted(true)}
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
