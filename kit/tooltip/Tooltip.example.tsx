// Golden example: a chart toolbar. The icon button has no visible text, so its tooltip is its name
// (type="label"); the Export button has text, so its tooltip only adds a hint. Spacing is token variables only.
import { IconButton, Tooltip } from "../index";

function SaveGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h9l3 3v9H4zM7 4v4h5V4M7 16v-5h6v5" />
    </svg>
  );
}

export default function ChartToolbar() {
  return (
    <div
      role="toolbar"
      aria-label="Chart"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-12)",
      }}
    >
      <Tooltip.Root type="label">
        <Tooltip.Trigger
          render={
            <IconButton aria-label="Save chart" variant="quiet">
              <SaveGlyph />
            </IconButton>
          }
        />
        <Tooltip.Popup>Save chart</Tooltip.Popup>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger variant="secondary">Export</Tooltip.Trigger>
        <Tooltip.Popup>Downloads the chart as an SVG file.</Tooltip.Popup>
      </Tooltip.Root>
    </div>
  );
}
