import { useState } from "react";
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

export default function SettingsPage() {
  const [name, setName] = useState("Orbit Lab");
  const [role, setRole] = useState("editor");
  const [weekly, setWeekly] = useState(true);
  const [mentions, setMentions] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);

  return (
    <main className="bg-background text-foreground min-h-screen p-6 sm:p-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">Workspace settings</h1>

        <Tabs defaultValue="general" className="gap-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="danger">Danger zone</TabsTrigger>
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
              />
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm leading-none font-medium">
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
                ].map(([value, label]) => (
                  <div key={value} className="flex items-center gap-2">
                    <RadioGroupItem value={value} id={`role-${value}`} />
                    <Label htmlFor={`role-${value}`}>{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex items-center gap-4">
              <Button onClick={() => setSaved(true)}>Save changes</Button>
              {saved && (
                <p role="status" className="text-muted-foreground text-sm">
                  Settings saved.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="weekly">Weekly summary email</Label>
              <Switch id="weekly" checked={weekly} onCheckedChange={setWeekly} />
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

          <TabsContent value="danger" className="flex flex-col gap-4">
            <p className="text-sm">
              Deleting this workspace is permanent and cannot be reversed.
            </p>
            <div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete workspace</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Orbit Lab?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all projects and members. It cannot be undone.
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
            </div>
          </TabsContent>
        </Tabs>

        {deleted && (
          <p role="status" className="text-sm font-medium">
            Workspace deleted.
          </p>
        )}
      </div>
    </main>
  );
}
