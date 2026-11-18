// Golden example: the actions on a star chart. The trigger's text names the menu. Plain items run
// through the Root's onAction (the status line reads the last one); the checkbox items and the radio
// group stay open so several settings change in one visit, and report through their own change
// handlers. Zoom is a submenu. Spacing is token variables only.
import { useState } from "react";
import { Menu } from "../index";

export default function ChartMenu() {
  const [last, setLast] = useState("Nothing yet.");
  const [grid, setGrid] = useState(true);
  const [labels, setLabels] = useState(false);
  const [projection, setProjection] = useState("polar");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-12)",
      }}
    >
      <Menu.Root onAction={(value) => setLast(`Ran ${value}.`)}>
        <Menu.Trigger>Chart</Menu.Trigger>
        <Menu.Popup>
          <Menu.Item value="rename">Rename</Menu.Item>
          <Menu.Item value="duplicate" shortcut="mod+d">
            Duplicate
          </Menu.Item>
          <Menu.Item value="export" disabled>
            Export as image
          </Menu.Item>
          <Menu.Separator />
          <Menu.Group>
            <Menu.GroupLabel>Show</Menu.GroupLabel>
            <Menu.CheckboxItem
              value="grid"
              checked={grid}
              onCheckedChange={setGrid}
            >
              Grid
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              value="labels"
              checked={labels}
              onCheckedChange={setLabels}
            >
              Body labels
            </Menu.CheckboxItem>
          </Menu.Group>
          <Menu.Separator />
          <Menu.RadioGroup
            value={projection}
            onValueChange={setProjection}
            aria-label="Projection"
          >
            <Menu.GroupLabel>Projection</Menu.GroupLabel>
            <Menu.RadioItem value="polar">Polar</Menu.RadioItem>
            <Menu.RadioItem value="flat">Flat</Menu.RadioItem>
          </Menu.RadioGroup>
          <Menu.Separator />
          <Menu.Sub>
            <Menu.SubTrigger>Zoom</Menu.SubTrigger>
            <Menu.SubPopup>
              <Menu.Item value="zoom-in">Zoom in</Menu.Item>
              <Menu.Item value="zoom-out">Zoom out</Menu.Item>
            </Menu.SubPopup>
          </Menu.Sub>
        </Menu.Popup>
      </Menu.Root>
      <span role="status">
        {last} Grid {grid ? "on" : "off"}, labels {labels ? "on" : "off"},{" "}
        {projection}.
      </span>
    </div>
  );
}
