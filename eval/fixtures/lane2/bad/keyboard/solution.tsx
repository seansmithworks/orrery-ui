// Bad fixture for the keyboard scorer (bare condition, scenario confirm-delete): the trigger is a div with
// role="button" and no tabindex (never reached by Tab, Enter does nothing), and the real button hides its focus ring.
import { useState } from "react";
import "./solution.css";

export default function NoKeyboard() {
  const [open, setOpen] = useState(false);
  return (
    <main className="page">
      <div role="button" className="btn" onClick={() => setOpen(true)}>
        Delete project
      </div>
      <button type="button" className="btn no-ring">
        Archive project
      </button>
      {open && <p>Delete this project?</p>}
    </main>
  );
}
