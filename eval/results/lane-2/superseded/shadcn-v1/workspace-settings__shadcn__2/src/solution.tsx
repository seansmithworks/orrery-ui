import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export default function WorkspaceSettings() {
  const [name, setName] = React.useState("Orbit Lab");
  const [role, setRole] = React.useState("editor");
  const [weekly, setWeekly] = React.useState(true);
  const [mentions, setMentions] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);

  return (
    <main className="bg-background text-foreground min-h-screen p-6 sm:p-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">Workspace settings</h1>

        <Tabs defaultValue="general" className="gap-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="danger">Danger zone</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <form
              className="flex flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                setSaved(true);
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                />
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-sm font-medium">
                  Default role for new members
                </legend>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => {
                    setRole(v);
                    setSaved(false);
                  }}
                  aria-label="Default role for new members"
                >
                  {[
                    ["viewer", "Viewer"],
                    ["editor", "Editor"],
                    ["admin", "Admin"],
                  ].map(([v, label]) => (
                    <div key={v} className="flex items-center gap-2">
                      <RadioGroupItem value={v} id={`role-${v}`} />
                      <Label htmlFor={`role-${v}`}>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>

              <div className="flex items-center gap-4">
                <Button type="submit">Save changes</Button>
                {saved && (
                  <p role="status" className="text-muted-foreground text-sm">
                    Settings saved.
                  </p>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="n-weekly">Weekly summary email</Label>
                <Switch
                  id="n-weekly"
                  checked={weekly}
                  onCheckedChange={setWeekly}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="n-mentions">Mentions</Label>
                <Switch
                  id="n-mentions"
                  checked={mentions}
                  onCheckedChange={setMentions}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="danger">
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm">
                Deleting this workspace is permanent and cannot be reversed.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete workspace</Button>
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
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setDeleted(true)}>
                      Delete workspace
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {deleted && (
                <p role="status" className="text-muted-foreground text-sm">
                  Workspace deleted.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
