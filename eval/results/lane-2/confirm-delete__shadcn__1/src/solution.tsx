import * as React from "react";
import { Button } from "@/components/ui/button";
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

const hit = "min-h-[var(--hit-target-min)] min-w-[var(--hit-target-min)]";

export default function Page() {
  const [deleted, setDeleted] = React.useState(false);

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-start gap-4 p-6 sm:p-10">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="secondary" className={hit}>
            Delete project
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              Its files and history are removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={hit}>Keep project</AlertDialogCancel>
            <AlertDialogAction className={hit} onClick={() => setDeleted(true)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p role="status" className="text-sm">
        {deleted ? "Project deleted." : ""}
      </p>
    </main>
  );
}
