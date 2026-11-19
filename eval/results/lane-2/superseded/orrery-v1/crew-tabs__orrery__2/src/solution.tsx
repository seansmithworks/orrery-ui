import { useId } from "react";
import { Button, Card, Tabs } from "./kit";

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
        <Tabs.Root defaultValue="overview">
          <Tabs.List aria-labelledby={titleId}>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="passes">Passes</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview">
            <p style={{ margin: 0 }}>Leads the docking checklist.</p>
          </Tabs.Panel>
          <Tabs.Panel value="passes">
            <p style={{ margin: 0 }}>Next close pass in four days.</p>
          </Tabs.Panel>
          <Tabs.Panel value="history">
            <p style={{ margin: 0 }}>Charted since March.</p>
          </Tabs.Panel>
        </Tabs.Root>
      </Card.Body>
      <Card.Footer>
        <Button variant="quiet">Remove from crew</Button>
        <Button variant="primary">Save changes</Button>
      </Card.Footer>
    </Card.Root>
  );
}
