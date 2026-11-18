// Golden example: share a chart. The panel holds one short task beside its trigger: a title that names it,
// a line of context and a way out. Focus moves into the panel on open and returns to Share on close.
// Spacing is token variables only.
import { Popover } from "../index";

export default function ShareChart() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-12)",
      }}
    >
      <span>Orbit of Kepler</span>
      <Popover.Root>
        <Popover.Trigger variant="secondary">Share</Popover.Trigger>
        <Popover.Popup>
          <Popover.Title>Share this chart</Popover.Title>
          <Popover.Description>
            Anyone with the link can view it. They cannot edit it.
          </Popover.Description>
          <Popover.Close variant="primary">Done</Popover.Close>
        </Popover.Popup>
      </Popover.Root>
    </div>
  );
}
