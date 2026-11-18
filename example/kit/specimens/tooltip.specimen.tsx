import { IconButton, Tooltip } from "../../../kit";
import type { SpecimenProps } from "../specimen";
import { HeldOpenFrame } from "../held-open-frame";
import "./tooltip.specimen.css";

export const block = "Tooltip";
export const note = "label drawing: strawman, Sean's call 8";
// The kit's CSS declares the trigger's height (the Button's hit target).
export const fixedSize = { height: ".orr-button" };

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

/**
 * The open state, held open inside its own frame (../held-open-frame.tsx): the frame's document is
 * the label's viewport, whatever the library does with a popup. Inert, a picture of the open state.
 * `controlled` open stays open with no pointer on the trigger.
 */
function OpenCell({
  name,
  label,
  side,
}: {
  name: string;
  label: string;
  side: "top" | "bottom";
}) {
  return (
    <div className="spec-cell" data-cell={name}>
      <span className="spec-label" aria-hidden="true">
        {name}
      </span>
      <HeldOpenFrame
        className="spec-tooltip-frame"
        bodyClassName={`spec-tooltip-frame__body spec-tooltip-frame__body--${side}`}
        title={`Export tooltip, ${name}, held open`}
        inert
      >
        {(body) => (
          <Tooltip.Root open>
            <Tooltip.Trigger>Export</Tooltip.Trigger>
            <Tooltip.Popup container={body} side={side} align="start">
              {label}
            </Tooltip.Popup>
          </Tooltip.Root>
        )}
      </HeldOpenFrame>
    </div>
  );
}

export default function TooltipSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      <div className="spec-cell" data-cell="rest">
        <span className="spec-label" aria-hidden="true">
          rest
        </span>
        <div className="spec-tooltip-row">
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
            <Tooltip.Trigger>Export</Tooltip.Trigger>
            <Tooltip.Popup>Downloads the chart as an SVG file.</Tooltip.Popup>
          </Tooltip.Root>
        </div>
      </div>
      <OpenCell name="open below" label="Downloads as SVG." side="bottom" />
      <OpenCell name="open above" label="Downloads as SVG." side="top" />
    </div>
  );
}
