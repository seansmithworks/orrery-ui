import { Tabs } from "../../../kit";
import type { SpecimenProps } from "../specimen";

export const block = "Tabs";
export const note = "strawman, selected bar pending";
// A tab is --hit-target-min high (tabs.css); it holds its label, so its height is not locked unless listed here.
export const fixedSize = { height: ".orr-tabs__tab" };

type TabsState = {
  name: string;
  selected: string;
  preview?: { tab: string; state: string };
  disabled?: string;
};

const TABS = [
  {
    value: "overview",
    label: "Overview",
    body: "Period 27.3 days, last pass two hours ago.",
  },
  { value: "moons", label: "Moons", body: "Two moons, both tidally locked." },
  {
    value: "history",
    label: "History",
    body: "Charted since March, edited by three people.",
  },
];

const STATES: TabsState[] = [
  { name: "first selected", selected: "overview" },
  { name: "second selected", selected: "moons" },
  {
    name: "hover",
    selected: "overview",
    preview: { tab: "moons", state: "hover" },
  },
  {
    name: "focus",
    selected: "overview",
    preview: { tab: "overview", state: "focus" },
  },
  { name: "disabled", selected: "overview", disabled: "history" },
];

export default function TabsSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      {STATES.map((s) => (
        <div key={s.name} className="spec-cell" data-cell={s.name}>
          <span className="spec-label" aria-hidden="true">
            {s.name}
          </span>
          <Tabs.Root defaultValue={s.selected}>
            <Tabs.List aria-label="Orbit">
              {TABS.map((t) => (
                <Tabs.Tab
                  key={t.value}
                  value={t.value}
                  disabled={s.disabled === t.value}
                  data-preview={
                    s.preview?.tab === t.value ? s.preview.state : undefined
                  }
                >
                  {t.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            {TABS.map((t) => (
              <Tabs.Panel key={t.value} value={t.value}>
                {t.body}
              </Tabs.Panel>
            ))}
          </Tabs.Root>
        </div>
      ))}
    </div>
  );
}
