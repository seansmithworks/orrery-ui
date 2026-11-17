// Golden example: the profile card of a crew member. An article named by its heading, a short
// description, two fields to edit, and a row of actions. Spacing is token variables only.
import { useId } from "react";
import { Button, Card, Field, Input } from "../index";

export default function CrewMemberCard() {
  const titleId = useId();

  return (
    <Card.Root render={<article />} aria-labelledby={titleId}>
      <Card.Header>
        <h3 id={titleId}>Ada Okafor</h3>
        <span style={{ color: "var(--text-muted)" }}>
          Flight engineer, Orbit 7
        </span>
      </Card.Header>
      <Card.Body>
        <p>
          Joined the crew in March. Leads the docking checklist and the weekly
          systems review.
        </p>
        <Field.Root name="role">
          <Field.Label>Role</Field.Label>
          <Input defaultValue="Flight engineer" />
        </Field.Root>
        <Field.Root name="callsign">
          <Field.Label>Call sign</Field.Label>
          <Input defaultValue="Kestrel" />
          <Field.Description>Shown on the crew roster.</Field.Description>
        </Field.Root>
      </Card.Body>
      <Card.Footer>
        <Button variant="quiet">Remove from crew</Button>
        <Button variant="primary">Save changes</Button>
      </Card.Footer>
    </Card.Root>
  );
}
