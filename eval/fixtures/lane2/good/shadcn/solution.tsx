// Positive control, shadcn condition, scenario confirm-delete: must score 1.00 on every headline scorer.
// The stock shadcn button is h-9 (36px); this control sets h-11 so the hit-target scorer can pass.
import { useState } from "react";
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

export default function DeleteProject() {
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="bg-background text-foreground flex min-h-screen items-start gap-3 p-8">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="secondary" className="h-11">
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
            <AlertDialogCancel className="h-11">Keep project</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={() => setDeleted(true)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <span role="status">{deleted ? "Project deleted." : ""}</span>
    </div>
  );
}
