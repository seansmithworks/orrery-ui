import { Popover } from "../../../kit";
import type { SpecimenProps } from "../specimen";
import { HeldOpenFrame } from "../held-open-frame";
import "./popover.specimen.css";

export const block = "Popover";
export const note = "panel drawing: strawman, Sean's call 8";
// The kit's CSS declares the trigger's height (the Button's hit target).
export const fixedSize = { height: ".orr-button" };

/** The panel's contents, shared by the live and the held-open cells. */
function Contents({ compact }: { compact?: boolean }) {
  return (
    <>
      <Popover.Title>Share this chart</Popover.Title>
      {!compact && (
        <Popover.Description>
          Anyone with the link can view it. They cannot edit it.
        </Popover.Description>
      )}
      <Popover.Close variant="primary">Done</Popover.Close>
    </>
  );
}

/**
 * The open state, held open inside its own frame (../held-open-frame.tsx), never the panel's live
 * portal: the frame's document is the popup's viewport, whatever the library does with a popup.
 * Not modal, so the rest of the page stays usable; inert, because it is a picture of the open state.
 */
function OpenCell({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <div className="spec-cell spec-popover-wide" data-cell={name}>
      <span className="spec-label" aria-hidden="true">
        {name}
      </span>
      <HeldOpenFrame
        className="spec-popover-frame"
        bodyClassName="spec-popover-frame__body"
        title={`Share popover, ${name}, held open`}
        inert
      >
        {(body) => (
          <Popover.Root open modal={false}>
            <Popover.Trigger>Share</Popover.Trigger>
            <Popover.Popup container={body}>
              <Contents compact={compact} />
            </Popover.Popup>
          </Popover.Root>
        )}
      </HeldOpenFrame>
    </div>
  );
}

export default function PopoverSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      <div className="spec-cell" data-cell="rest">
        <span className="spec-label" aria-hidden="true">
          rest
        </span>
        <Popover.Root>
          <Popover.Trigger>Share</Popover.Trigger>
          <Popover.Popup>
            <Contents />
          </Popover.Popup>
        </Popover.Root>
      </div>
      <OpenCell name="open" />
      <OpenCell name="open compact" compact />
    </div>
  );
}
