// Golden example: confirm deleting an orbit. One optional choice with a hint, and one required tick. Base UI's Form
// validates on submit: a missing tick blocks the submit, focuses the box and shows the valueMissing error.
// Spacing is token variables only.
import { useState } from "react";
import { Form } from "@base-ui/react/form";
import { Button, Checkbox, Field } from "../index";

export default function ConfirmDeleteOrbit() {
  const [deleted, setDeleted] = useState(false);

  return (
    <Form
      onFormSubmit={() => setDeleted(true)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-20)",
      }}
    >
      <Field.Root>
        <Field.Label>
          <Checkbox name="deleteCharts" defaultChecked />
          Also delete its 12 charts
        </Field.Label>
        <Field.Description>
          Charts that other dashboards use are kept.
        </Field.Description>
      </Field.Root>
      <Field.Root>
        <Field.Label>
          <Checkbox name="understood" required />I understand this cannot be
          undone
        </Field.Label>
        <Field.Error match="valueMissing">
          Tick this box to confirm. Orbit 7 cannot be restored.
        </Field.Error>
      </Field.Root>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-12)",
        }}
      >
        <Button variant="primary" type="submit">
          Delete orbit
        </Button>
        <span role="status">{deleted ? "Orbit 7 deleted." : ""}</span>
      </div>
    </Form>
  );
}
