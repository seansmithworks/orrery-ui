// Golden example: an orbit's detail view. Three views of one orbit, read one at a time, the list named by the
// visible heading. Each Tab has a Panel with the same value. Spacing is token variables only.
import { Tabs } from "../index";

export default function OrbitDetail() {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-12)",
      }}
    >
      <h2 id="orbit-detail-title" style={{ margin: 0 }}>
        Luna
      </h2>
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-labelledby="orbit-detail-title">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="passes">Passes</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">
          <p style={{ margin: 0 }}>Period 27.3 days. Tidally locked.</p>
        </Tabs.Panel>
        <Tabs.Panel value="passes">
          <p style={{ margin: 0 }}>Next close pass in four days.</p>
        </Tabs.Panel>
        <Tabs.Panel value="history">
          <p style={{ margin: 0 }}>
            Charted since March, edited by three people.
          </p>
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  );
}
