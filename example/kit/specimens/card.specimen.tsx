import { Button, Card, Field, Input } from "../../../kit";
import type { SpecimenProps } from "../specimen";

export const block = "Card";

const LONG =
  "Supercalifragilisticexpialidocious-orbital-insertion-checklist-revision-0042-final-approved-by-flight-director-and-the-entire-review-board, followed by ordinary words that should wrap across several lines without ever leaving the rounded corners of the card.";

export default function CardSpecimen({ panel }: SpecimenProps) {
  const id = (s: string) => `${panel.id}-card-${s}`;
  return (
    <div className="spec-fields">
      <div className="spec-cell" data-cell="rest">
        <span className="spec-label" aria-hidden="true">
          rest
        </span>
        <Card.Root>
          <p style={{ margin: 0 }}>A card at rest, holding plain text.</p>
        </Card.Root>
      </div>

      <div className="spec-cell" data-cell="button">
        <span className="spec-label" aria-hidden="true">
          with button
        </span>
        <Card.Root>
          <p style={{ margin: 0 }}>Ready to launch.</p>
          <Card.Footer>
            <Button variant="primary">Launch</Button>
          </Card.Footer>
        </Card.Root>
      </div>

      <div className="spec-cell" data-cell="field">
        <span className="spec-label" aria-hidden="true">
          with field
        </span>
        <Card.Root>
          <Field.Root name={id("name")}>
            <Field.Label>Orbit name</Field.Label>
            <Input defaultValue="Orbit 7" />
            <Field.Description>Shown on the crew roster.</Field.Description>
          </Field.Root>
        </Card.Root>
      </div>

      <div className="spec-cell" data-cell="parts">
        <span className="spec-label" aria-hidden="true">
          header, body, footer
        </span>
        <Card.Root
          render={<article />}
          aria-labelledby={id("title")}
          className="card-extra"
          ref={(el) => el?.setAttribute("data-ref", el.tagName)}
        >
          <Card.Header>
            <h4 id={id("title")}>Rename orbit</h4>
            <span style={{ color: "var(--text-muted)" }}>Orbit 7</span>
          </Card.Header>
          <Card.Body>
            <p>The new name appears everywhere the orbit is listed.</p>
          </Card.Body>
          <Card.Footer>
            <Button variant="quiet">Cancel</Button>
            <Button variant="primary">Save</Button>
          </Card.Footer>
        </Card.Root>
      </div>

      <div className="spec-cell" data-cell="overflow">
        <span className="spec-label" aria-hidden="true">
          long content
        </span>
        <Card.Root>
          <Card.Body>
            <p>{LONG}</p>
          </Card.Body>
        </Card.Root>
      </div>
    </div>
  );
}
